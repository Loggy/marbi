import { Injectable, OnModuleInit, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../../entities/order.entity";
import { EVMService, EVMSwapResult } from "../../blockchain/evm/evm.service";
import {
  SolanaService,
  SolanaSwapParams,
  SolanaSwapResult,
} from "../../blockchain/solana/solana.service";
import { DexRouterService } from "../../dex-router/dex-router.service";
import { LoggerService } from "../../logger/logger.service";
import { SettingsService } from "../../settings/settings.service";
import { CreateOrderDto, NetworkConfig } from "./dto/create-order.dto";
import { Initialize } from "src/entities/initialize.entity";
import { EVMSwapParams } from "src/blockchain/evm/providers/okx";
import { TokenBalance } from "src/entities/token-balance.entity";
import { AppStateService } from "../../settings/app-state.service";
import { parseCompactSignature } from "viem";

const NETWORK_TO_EXPLORER = {
  solana: "https://solscan.io/tx/",
  ethereum: "https://etherscan.io/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  base: "https://basescan.org/tx/",
  polygon: "https://polygonscan.com/tx/",
  avalanche: "https://snowtrace.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  gnosis: "https://gnosisscan.io/tx/",
  fantom: "https://ftmscan.com/tx/",
  bsc: "https://bscscan.com/tx/",
} as const;

const NETWORK_TO_NATIVE_TOKEN = {
  solana: "SOL",
  ethereum: "ETH",
  arbitrum: "ETH",
  base: "ETH",
  polygon: "MATIC",
  avalanche: "AVAX",
  optimism: "ETH",
  gnosis: "XDAI",
  fantom: "FTM",
  bsc: "BNB",
} as const;

@Injectable()
export class DDService implements OnModuleInit {
  private readonly MAX_RETRIES = 5;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Initialize)
    private initializeRepository: Repository<Initialize>,
    @InjectRepository(TokenBalance)
    private tokenBalanceRepository: Repository<TokenBalance>,
    private evmService: EVMService,
    private solanaService: SolanaService,
    private dexRouterService: DexRouterService,
    private settingsService: SettingsService,
    private logger: LoggerService,
    private appStateService: AppStateService
  ) {}

  async onModuleInit() {
    try {
      await this.initializeFromLastConfig();
    } catch (error) {
      await this.logger.log(
        `Failed to initialize from last config: ${error.message}`,
        "error"
      );
    }
  }

  private async initializeFromLastConfig(): Promise<void> {
    const [lastInitialize] = await this.initializeRepository.find({
      order: {
        createdAt: "DESC",
      },
      take: 1,
    });

    if (!lastInitialize) {
      throw new Error("No initialization config found in database");
    }

    await this.logger.log("Initializing service with last saved configuration");

    try {
      await this.settingsService.initialize(lastInitialize.params);
    } catch (error) {
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  private async updateAllTokenBalances(params: CreateOrderDto): Promise<void> {
    const network0 = params.config.Network0;
    const network1 = params.config.Network1;

    // Update Network0 token balances
    await Promise.all([
      this.settingsService.updateTokenBalance({
        address: network0.StartTokenAddress,
        chainId: network0.NetworkName,
        decimals: parseInt(network0.StartTokenDecimals),
      }),
      this.settingsService.updateTokenBalance({
        address: network0.FinishTokenAddress,
        chainId: network0.NetworkName,
        decimals: parseInt(network0.FinishTokenDecimals),
      }),
    ]);

    // Update Network1 token balances
    await Promise.all([
      this.settingsService.updateTokenBalance({
        address: network1.StartTokenAddress,
        chainId: network1.NetworkName,
        decimals: parseInt(network1.StartTokenDecimals),
      }),
      this.settingsService.updateTokenBalance({
        address: network1.FinishTokenAddress,
        chainId: network1.NetworkName,
        decimals: parseInt(network1.FinishTokenDecimals),
      }),
    ]);
  }

  private async requestRoute(
    networkConfig: NetworkConfig,
    amount: string,
    networkName: string
  ): Promise<any> {
    await this.logger.log(
      `Requesting route for ${networkName} with amount ${amount}.`
    );
    if (networkName === "solana") {
      return this.dexRouterService.getSolanaRoute({
        fromToken: networkConfig.StartTokenAddress,
        toToken: networkConfig.FinishTokenAddress,
        amount: amount,
        slippage: networkConfig.SlippagePercent,
      });
    } else {
      return this.dexRouterService.getEVMRoute({
        fromToken: networkConfig.StartTokenAddress,
        toToken: networkConfig.FinishTokenAddress,
        amount: amount,
        slippage: networkConfig.SlippagePercent,
        chainName: networkConfig.NetworkName,
      });
    }
  }

  private async requestRoutes(
    params: CreateOrderDto
  ): Promise<{ network0: any; network1: any }> {
    return Promise.all([
      this.requestRoute(
        params.config.Network0,
        params.config.Amounts_In[0].amount.toString(),
        params.config.Network0.NetworkName
      ),
      this.requestRoute(
        params.config.Network1,
        params.config.Amounts_In[1].amount.toString(),
        params.config.Network1.NetworkName
      ),
    ]).then(([network0Result, network1Result]) => ({
      network0: network0Result,
      network1: network1Result,
    }));
  }

  // private async requestRoutesWithRetry(
  //   params: CreateOrderDto,
  //   retries = this.MAX_RETRIES
  // ): Promise<{ network0: any; network1: any }> {
  //   try {
  //     return await this.requestRoutes(params);
  //   } catch (error) {
  //     if (retries > 0) {
  //       await this.logger.log(
  //         `Retry attempt ${this.MAX_RETRIES - retries + 1}: ${error.message}`,
  //         "warn"
  //       );
  //       return this.requestRoutesWithRetry(params, retries - 1);
  //     }
  //     throw new Error(
  //       `Failed after ${this.MAX_RETRIES} retries: ${error.message}`
  //     );
  //   }
  // }

  private async executeTransaction(
    params: SolanaSwapParams | EVMSwapParams,
    networkName: string,
    privateKey: string,
    address: string,
    retries = this.MAX_RETRIES
  ): Promise<SolanaSwapResult | EVMSwapResult> {
    const execute = async () => {
      if (networkName === "solana") {
        return this.solanaService.executeSwap({
          ...(params as SolanaSwapParams),
          privateKey: privateKey,
        });
      } else {
        return this.evmService.executeSwap({
          ...(params as EVMSwapParams),
          privateKey: privateKey,
        });
      }
    };

    try {
      return await execute();
    } catch (error) {
      if (retries > 0) {
        console.log(error);
        await this.logger.log(
          `Retry attempt ${this.MAX_RETRIES - retries + 1} for ${networkName}: ${error.message}`,
          "warn"
        );
        return this.executeTransaction(
          params,
          networkName,
          privateKey,
          address,
          retries - 1
        );
      }
      throw new Error(
        `Failed after ${this.MAX_RETRIES} retries for ${networkName}: ${error.message}`
      );
    }
  }

  async createOrder(params: CreateOrderDto): Promise<Order> {
    const startTime = new Date();

    // Check if app is initialized
    if (!this.appStateService.getIsInitialized()) {
      this.logger.log("App is not initialized yet", "error");
      throw new BadRequestException("App is not initialized yet");
    }

    const order = this.orderRepository.create({
      params,
      status: "PENDING",
    });

    await this.logger.log(
      `Creating new DD order for ${params.config.Ticker} on ${params.config.Network0.NetworkName} and ${params.config.Network1.NetworkName}`
    );

    try {
      const network0TokenBalance = await this.tokenBalanceRepository.findOne({
        where: {
          address: params.config.Network0.swapParams.fromToken,
          chainId:
            "chainId" in params.config.Network0.swapParams
              ? params.config.Network0.swapParams.chainId
              : "101",
        },
      });

      if (!network0TokenBalance) {
        throw new Error(
          `Token balance not found for ${params.config.Network0.swapParams.fromToken}
          chain: ${params.config.Network0.NetworkName}`
        );
      }

      if (
        Number(network0TokenBalance.balance) <
        Number(params.config.Network0.swapParams.amount)
      ) {
        throw new Error(
          `Insufficient balance for ${params.config.Network0.swapParams.fromToken}
${network0TokenBalance.balance} less than ${params.config.Network0.swapParams.amount}
chain: ${params.config.Network0.NetworkName}`
        );
      }

      if (
        Number(network0TokenBalance.currentAllowance) <
          Number(params.config.Network0.swapParams.amount) &&
        network0TokenBalance.chainId !== "101"
      ) {
        throw new Error(
          `Insufficient allowance for ${params.config.Network0.swapParams.fromToken}
${network0TokenBalance.currentAllowance} less than ${params.config.Network0.swapParams.amount}
chain: ${params.config.Network0.NetworkName}`
        );
      }

      const network1TokenBalance = await this.tokenBalanceRepository.findOne({
        where: {
          address: params.config.Network1.swapParams.fromToken,
          chainId:
            "chainId" in params.config.Network1.swapParams
              ? params.config.Network1.swapParams.chainId
              : "101",
        },
      });

      if (!network1TokenBalance) {
        throw new Error(
          `Token balance not found for ${params.config.Network1.swapParams.fromToken}
          chain: ${params.config.Network1.NetworkName}`
        );
      }

      if (
        Number(network1TokenBalance.balance) <
        Number(params.config.Network1.swapParams.amount)
      ) {
        throw new Error(
          `Insufficient balance for ${params.config.Network1.swapParams.fromToken}
${network1TokenBalance.balance} less than ${params.config.Network1.swapParams.amount}
chain: ${params.config.Network1.NetworkName}`
        );
      }

      if (
        Number(network1TokenBalance.currentAllowance) <
          Number(params.config.Network1.swapParams.amount) &&
        network1TokenBalance.chainId !== "101"
      ) {
        throw new Error(
          `Insufficient allowance for ${params.config.Network1.swapParams.fromToken}
${network1TokenBalance.currentAllowance} less than ${params.config.Network1.swapParams.amount}
chain: ${params.config.Network1.NetworkName}`
        );
      }

      this.logger.telegramNotify(`Starting transactions for ${params.config.Ticker} on ${params.config.Network0.NetworkName} and ${params.config.Network1.NetworkName}
${new Date().toUTCString()}`);

      const [network0TxResult, network1TxResult] = await Promise.all([
        this.executeTransaction(
          params.config.Network0.swapParams,
          params.config.Network0.NetworkName,
          params.config.Network0.wallet.key,
          params.config.Network0.wallet.address
        ),

        this.executeTransaction(
          params.config.Network1.swapParams,
          params.config.Network1.NetworkName,
          params.config.Network1.wallet.key,
          params.config.Network1.wallet.address
        ),
      ]);

      const network0FromToken = await this.tokenBalanceRepository.findOne({
        where: {
          address: params.config.Network0.swapParams.fromToken,
        },
      });

      const network0ToToken = await this.tokenBalanceRepository.findOne({
        where: {
          address: params.config.Network0.swapParams.toToken,
        },
      });

      const network1FromToken = await this.tokenBalanceRepository.findOne({
        where: {
          address: params.config.Network1.swapParams.fromToken,
        },
      });

      const network1ToToken = await this.tokenBalanceRepository.findOne({
        where: {
          address: params.config.Network1.swapParams.toToken,
        },
      });

      order.status = "COMPLETED";
      order.result = {
        network0: {
          fromToken: params.config.Network0.swapParams.fromToken,
          toToken: params.config.Network0.swapParams.toToken,
          networkName: params.config.Network0.NetworkName,
          txid: network0TxResult.txid,
          fromTokenBalanceChange: (
            Number(network0TxResult.fromTokenBalanceChange) /
            10 ** network0FromToken.decimals
          ).toString(),
          toTokenBalanceChange: (
            Number(network0TxResult.toTokenBalanceChange) /
            10 ** network0ToToken.decimals
          ).toString(),
          time: (network0TxResult.endTimestamp - startTime.getTime()) / 1000,
          gasPayed: network0TxResult.gasPayed,
        },
        network1: {
          fromToken: params.config.Network1.swapParams.fromToken,
          toToken: params.config.Network1.swapParams.toToken,
          networkName: params.config.Network1.NetworkName,
          txid: network1TxResult.txid,
          fromTokenBalanceChange: (
            Number(network1TxResult.fromTokenBalanceChange) /
            10 ** network1FromToken.decimals
          ).toString(),
          toTokenBalanceChange: (
            Number(network1TxResult.toTokenBalanceChange) /
            10 ** network1ToToken.decimals
          ).toString(),
          time: (network1TxResult.endTimestamp - startTime.getTime()) / 1000,
          gasPayed: network1TxResult.gasPayed,
        },
      };

      const startTimeUTC = startTime.toUTCString();

      const network0Message = this.generateMessageForTelegram(
        order.result.network0
      );
      const network1Message = this.generateMessageForTelegram(
        order.result.network1
      );

      const message = `<b>${params.config.Ticker}</b> ${startTimeUTC}
${network0Message}
${network1Message}`;

      this.logger.log(`Order completed:
        network0Result: ${JSON.stringify(order.result.network0)}
        network1Result: ${JSON.stringify(order.result.network1)}`);

      await this.logger.telegramNotify(message, "HTML");
    } catch (error) {
      order.status = "FAILED";
      order.result = {
        error: error.message,
      };
      await this.logger.log(`Order failed: ${error.message}`, "error");
      await this.logger.telegramNotify(
        `Order failed: ${error.message}`,
        undefined,
        "error"
      );
    }

    return await this.orderRepository.save(order);
  }

  private generateMessageForTelegram(result: any): string {
    const nativeToken = NETWORK_TO_NATIVE_TOKEN[result.networkName as keyof typeof NETWORK_TO_NATIVE_TOKEN];
    const message = `
${result.networkName} <a href="${NETWORK_TO_EXPLORER[result.networkName]}${result.txid}">Explorer</a>

txId: <code>${result.txid}</code>
from: <code>${result.fromToken}</code>
change: ${result.fromTokenBalanceChange}
to: <code>${result.toToken}</code>
change: ${result.toTokenBalanceChange}
time: ${result.time.toFixed(2)}s

gasPayed: ${result.gasPayed} $${nativeToken}
`;

    return message;
  }
}
