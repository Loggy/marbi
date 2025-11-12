import { Injectable, OnModuleInit, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
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
import { BybitPriceService } from '../../shared/services/bybit-price.service';
import { StrategyService } from "../../strategy/strategy.service";
import * as crypto from "crypto";

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
@Processor("strategy-dex-to-dex")
export class DDService implements OnModuleInit {
  private readonly MAX_RETRIES = 5;
  private readonly SPREAD_SIZE_IN_BIPS = 20;

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
    private appStateService: AppStateService,
    private bybitPriceService: BybitPriceService,
    private strategyService: StrategyService
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

  private async calculateGasPayedUSD(networkName: string, gasPayed: number): Promise<number> {
    try {
      const nativeToken = NETWORK_TO_NATIVE_TOKEN[networkName as keyof typeof NETWORK_TO_NATIVE_TOKEN];
      const price = await this.bybitPriceService.getPrice(nativeToken);
      return (gasPayed * Number(price));
    } catch (error) {
      this.logger.log(`Failed to calculate gas price in USD: ${error.message}`, 'warn');
      return 0;
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

      

      this.logger.telegramNotify(`Starting transactions for ${params.config.Ticker} from ${params.config[params.spread_entry.from_network].NetworkName} to ${params.config[params.spread_entry.to_network].NetworkName}
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

      // Calculate gas prices in USD
      const [network0GasPayedUSD, network1GasPayedUSD] = await Promise.all([
        this.calculateGasPayedUSD(params.config.Network0.NetworkName, network0TxResult.gasPayed),
        this.calculateGasPayedUSD(params.config.Network1.NetworkName, network1TxResult.gasPayed)
      ]);

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
          gasPayedUSD: network0GasPayedUSD
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
          gasPayedUSD: network1GasPayedUSD
        },
      };

      const startTimeUTC = startTime.toUTCString();

      const network0Message = this.generateMessageForTelegram(
        order.result.network0
      );
      const network1Message = this.generateMessageForTelegram(
        order.result.network1
      );
      const quoteTokenPrice = (params.spread_entry.new_sell_price + params.spread_entry.new_buy_price) / 2;
      const baseTokenPrice = await this.bybitPriceService.getPrice(params.config.Network0.StartTokenTiker);
      const baseTokenDiff =
        order.result.network0.fromToken === params.config.Network0.StartTokenAddress
          ? Number(order.result.network0.fromTokenBalanceChange) + Number(order.result.network1.toTokenBalanceChange)
          : Number(order.result.network1.fromTokenBalanceChange) + Number(order.result.network0.toTokenBalanceChange);
      const quoteTokenDiff =
        order.result.network0.toToken === params.config.Network0.FinishTokenAddress
          ? Number(order.result.network0.toTokenBalanceChange) + Number(order.result.network1.fromTokenBalanceChange)
          : Number(order.result.network1.toTokenBalanceChange) + Number(order.result.network0.fromTokenBalanceChange);
      const baseTokenDiffInUSD = baseTokenDiff * Number(baseTokenPrice);
      const quoteTokenDiffInUSD = quoteTokenDiff * Number(quoteTokenPrice);
      const resultMessage = `
baseTokenDiff: <b>${baseTokenDiff}</b>
baseTokenDiffInUSD: <b>${baseTokenDiffInUSD.toFixed(3)} $USD</b>

qouteTokenDiff: <b>${quoteTokenDiff}</b>
quoteTokenDiffInUSD: <b>${quoteTokenDiffInUSD.toFixed(3)} $USD</b>

overallResult: <b>${(baseTokenDiffInUSD + quoteTokenDiffInUSD - (order.result.network0.gasPayedUSD + order.result.network1.gasPayedUSD)).toFixed(3)} $USD</b>
      `;
      const message = `<b>${params.config.Ticker}</b> ${startTimeUTC}

${resultMessage}
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
    const message = `${result.networkName} <a href="${NETWORK_TO_EXPLORER[result.networkName]}${result.txid}">Explorer</a>

txId: <code>${result.txid}</code>
from: <code>${result.fromToken}</code>
change: ${result.fromTokenBalanceChange}
to: <code>${result.toToken}</code>
change: ${result.toTokenBalanceChange}
time: ${result.time.toFixed(2)}s
gasPayedInUSD: <b>${result.gasPayedUSD.toFixed(3)} $USD</b>
gasPayed: ${result.gasPayed} $${nativeToken}
`;

    return message;
  }

  /**
   * Makes OKX DEX aggregator quote request
   */
  private async getOkxQuote(params: {
    chainId: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    slippage?: string;
  }): Promise<any> {
    const { chainId, fromTokenAddress, toTokenAddress, amount, slippage = "1" } = params;
    const queryParams = [
      `chainIndex=${chainId}`,
      `fromTokenAddress=${fromTokenAddress}`,
      `toTokenAddress=${toTokenAddress}`,
      `amount=${amount}`,
      `swapMode=exactIn`,
      `slippage=${slippage}`
    ].join('&');
    const method = 'GET';
    const requestPath = '/api/v5/dex/aggregator/quote';
    const fullPath = `${requestPath}?${queryParams}`;
    const url = `https://www.okx.com${fullPath}`;
    const timestamp = new Date().toISOString();
    const apiKey = process.env.OKX_API_KEY;
    const secret = process.env.OKX_SECRET_KEY;
    const passphrase = process.env.OKX_PASSPHRASE;
    const sign = crypto
      .createHmac('sha256', secret)
      .update(timestamp + method + fullPath)
      .digest('base64');
    const headers = {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
    };
    const response = await fetch(url, { headers });
    return response.json();
  }

  /**
   * Calculates spread between two amounts
   */
  private calculateSpread(params: {
    spentAmount: number;
    receivedAmountRaw: string;
    receivedDecimals: number;
  }): {
    spreadPercent: number;
    spreadUsd: number;
    profitable: boolean;
  } {
    const { spentAmount, receivedAmountRaw, receivedDecimals } = params;
    const receivedAmount = Number(receivedAmountRaw) / 10 ** receivedDecimals;
    const spreadPercent = ((receivedAmount / spentAmount) - 1) * 100;
    const spreadUsd = receivedAmount - spentAmount;
    const profitable = spreadUsd > 0;
    return {
      spreadPercent,
      spreadUsd,
      profitable
    };
  }

  /**
   * Process swap events from strategy-dex-to-dex queue
   * Analyzes arbitrage opportunities by checking spreads across all pools in the strategy
   * Filters out swaps below $50 USD minimum threshold
   */
  @Process("swap-event")
  async handleStrategySwapEvent(job: Job) {
    try {
      const swapData = job.data;
      const MIN_SWAP_SIZE_USD = 50;
      const swapSizeUsd = swapData.analysis?.swapSizeUsd;
      if (!swapSizeUsd || swapSizeUsd < MIN_SWAP_SIZE_USD) {
        await this.logger.log(
          `Skipping swap: size ${swapSizeUsd ? '$' + swapSizeUsd.toFixed(2) : 'unknown'} is below minimum $${MIN_SWAP_SIZE_USD} threshold`
        );
        return { success: true, skipped: true, reason: "below_minimum_threshold" };
      }
      await this.logger.log(
        `Processing DEX-to-DEX strategy swap event:\n` +
        `Pool: ${swapData.pool.address}\n` +
        `DEX: ${swapData.pool.dexName}\n` +
        `Chain: ${swapData.chainId}\n` +
        `Strategy: ${swapData.strategy.type}\n` +
        `Direction: ${swapData.analysis?.direction}\n` +
        `Swap Size: $${swapSizeUsd.toFixed(2)}`
      );
      const strategy = await this.strategyService.findOne(swapData.strategy.id);
      if (!strategy || !strategy.pools || strategy.pools.length === 0) {
        await this.logger.log(
          `Strategy ${swapData.strategy.id} has no pools`,
          "warn"
        );
        return { success: true, skipped: true, reason: "no_pools_in_strategy" };
      }
      const allPools = strategy.pools;
      const eventPool = allPools.find(pool => pool.id === swapData.poolId);
      if (!eventPool) {
        await this.logger.log(
          `Event pool not found in strategy pools`,
          "warn"
        );
        return { success: true, skipped: true, reason: "event_pool_not_found" };
      }
      const otherPools = allPools.filter(pool => pool.id !== swapData.poolId);
      if (otherPools.length === 0) {
        await this.logger.log(
          `No other pools in strategy ${swapData.strategy.type} to check for arbitrage`,
          "warn"
        );
        return { success: true, skipped: true, reason: "no_other_pools" };
      }
      await this.logger.log(
        `Checking spread opportunities across ${allPools.length} pools (${otherPools.length} other pools)`
      );
      const swapDirection = swapData.analysis?.direction;
      const token0 = swapData.token0;
      const token1 = swapData.token1;
      const swapAmountUsd = swapSizeUsd;
      const eventPoolToken0InPool = eventPool.token0.symbol === token0.symbol
        ? eventPool.token0Address
        : eventPool.token1Address;
      const eventPoolToken1InPool = eventPool.token0.symbol === token1.symbol
        ? eventPool.token0Address
        : eventPool.token1Address;
      if (!eventPoolToken0InPool || !eventPoolToken1InPool) {
        await this.logger.log(
          `Token addresses not found in event pool`,
          "warn"
        );
        return { success: true, skipped: true, reason: "token_addresses_not_found" };
      }
      const initialQuotePromises = otherPools.map(async (pool) => {
        try {
          const poolToken0InPool = pool.token0.symbol === token0.symbol
            ? pool.token0Address
            : pool.token1Address;
          const poolToken1InPool = pool.token0.symbol === token1.symbol
            ? pool.token0Address
            : pool.token1Address;
          if (!poolToken0InPool || !poolToken1InPool) {
            return null;
          }
          let fromToken: string;
          let toToken: string;
          let fromDecimals: number;
          let toDecimals: number;
          let amount: string;
          if (swapDirection === "BUY") {
            fromToken = poolToken0InPool;
            toToken = poolToken1InPool;
            fromDecimals = token0.decimals;
            toDecimals = token1.decimals;
            amount = (swapAmountUsd * 10 ** fromDecimals).toString();
          } else {
            fromToken = poolToken1InPool;
            toToken = poolToken0InPool;
            fromDecimals = token1.decimals;
            toDecimals = token0.decimals;
            amount = (swapAmountUsd * 10 ** fromDecimals).toString();
          }
          const quoteData = await this.getOkxQuote({
            chainId: pool.chainId.toString(),
            fromTokenAddress: fromToken,
            toTokenAddress: toToken,
            amount: amount,
            slippage: "1",
          });
          if (quoteData.code !== "0") {
            await this.logger.log(
              `Failed to get quote for pool ${pool.poolAddress}: ${quoteData.msg}`,
              "warn"
            );
            return null;
          }
          const receivedAmountRaw = quoteData.data?.[0]?.toTokenAmount;
          if (!receivedAmountRaw) {
            return null;
          }
          const spread = this.calculateSpread({
            spentAmount: swapAmountUsd,
            receivedAmountRaw: receivedAmountRaw,
            receivedDecimals: toDecimals,
          });
          return {
            pool,
            chainId: pool.chainId,
            fromToken,
            toToken,
            amount,
            receivedAmountRaw,
            fromDecimals,
            toDecimals,
            spread,
          };
        } catch (error) {
          await this.logger.log(
            `Error getting quote for pool ${pool.poolAddress}: ${error.message}`,
            "error"
          );
          return null;
        }
      });
      const eventPoolQuotePromise = (async () => {
        try {
          let fromToken: string;
          let toToken: string;
          let fromDecimals: number;
          let toDecimals: number;
          let amount: string;
          if (swapDirection === "BUY") {
            fromToken = eventPoolToken1InPool;
            toToken = eventPoolToken0InPool;
            fromDecimals = token1.decimals;
            toDecimals = token0.decimals;
            amount = (swapAmountUsd * 10 ** fromDecimals).toString();
          } else {
            fromToken = eventPoolToken0InPool;
            toToken = eventPoolToken1InPool;
            fromDecimals = token0.decimals;
            toDecimals = token1.decimals;
            amount = (swapAmountUsd * 10 ** fromDecimals).toString();
          }
          const quoteData = await this.getOkxQuote({
            chainId: eventPool.chainId.toString(),
            fromTokenAddress: fromToken,
            toTokenAddress: toToken,
            amount: amount,
            slippage: "1",
          });
          if (quoteData.code !== "0") {
            await this.logger.log(
              `Failed to get quote for event pool: ${quoteData.msg}`,
              "warn"
            );
            return null;
          }
          const receivedAmountRaw = quoteData.data?.[0]?.toTokenAmount;
          if (!receivedAmountRaw) {
            return null;
          }
          const spread = this.calculateSpread({
            spentAmount: swapAmountUsd,
            receivedAmountRaw: receivedAmountRaw,
            receivedDecimals: toDecimals,
          });
          return {
            pool: eventPool,
            chainId: eventPool.chainId,
            fromToken,
            toToken,
            amount,
            receivedAmountRaw,
            fromDecimals,
            toDecimals,
            spread,
          };
        } catch (error) {
          await this.logger.log(
            `Error getting quote for event pool: ${error.message}`,
            "error"
          );
          return null;
        }
      })();
      const [eventPoolQuote, ...otherPoolsQuotes] = await Promise.all([
        eventPoolQuotePromise,
        ...initialQuotePromises,
      ]);
      const allQuotes = [eventPoolQuote, ...otherPoolsQuotes].filter(q => q !== null);
      if (allQuotes.length === 0) {
        await this.logger.log("No valid quotes received");
        return { success: true, skipped: true, reason: "no_valid_quotes" };
      }
      allQuotes.sort((a, b) => b.spread.spreadPercent - a.spread.spreadPercent);
      const bestSpread = allQuotes[0];
      await this.logger.log(
        `Best initial spread found:\n` +
        `Pool: ${bestSpread.pool.poolAddress} (${bestSpread.pool.dex.name})\n` +
        `Chain: ${bestSpread.chainId}\n` +
        `Spread: ${bestSpread.spread.spreadPercent.toFixed(2)}% (${bestSpread.spread.spreadUsd.toFixed(2)} USD)\n` +
        `Profitable: ${bestSpread.spread.profitable}`
      );
      const spreadInBips = bestSpread.spread.spreadPercent * 100;
      if (spreadInBips <= this.SPREAD_SIZE_IN_BIPS) {
        await this.logger.log(
          `Spread ${spreadInBips.toFixed(0)} bips is below threshold ${this.SPREAD_SIZE_IN_BIPS} bips`
        );
        return { success: true, skipped: true, reason: "spread_below_threshold" };
      }
      await this.logger.log(
        `Confirming best spread with second request...`
      );
      const confirmQuoteData = await this.getOkxQuote({
        chainId: bestSpread.chainId.toString(),
        fromTokenAddress: bestSpread.fromToken,
        toTokenAddress: bestSpread.toToken,
        amount: bestSpread.amount,
        slippage: "1",
      });
      if (confirmQuoteData.code !== "0") {
        await this.logger.log(
          `Failed to confirm quote: ${confirmQuoteData.msg}`,
          "warn"
        );
        return { success: true, skipped: true, reason: "confirmation_failed" };
      }
      const confirmedReceivedAmountRaw = confirmQuoteData.data?.[0]?.toTokenAmount;
      if (!confirmedReceivedAmountRaw) {
        await this.logger.log(
          `No toTokenAmount in confirmation response`,
          "warn"
        );
        return { success: true, skipped: true, reason: "no_confirmed_amount" };
      }
      const confirmedSpread = this.calculateSpread({
        spentAmount: swapAmountUsd,
        receivedAmountRaw: confirmedReceivedAmountRaw,
        receivedDecimals: bestSpread.toDecimals,
      });
      const confirmedSpreadInBips = confirmedSpread.spreadPercent * 100;
      await this.logger.log(
        `Confirmed spread: ${confirmedSpread.spreadPercent.toFixed(2)}% (${confirmedSpreadInBips.toFixed(0)} bips)`
      );
      if (confirmedSpreadInBips > this.SPREAD_SIZE_IN_BIPS) {
        console.log(
          `\n🚨 PROFITABLE SPREAD DETECTED 🚨\n` +
          `Strategy: ${swapData.strategy.type}\n` +
          `Direction: ${swapDirection}\n` +
          `Pool: ${bestSpread.pool.poolAddress}\n` +
          `DEX: ${bestSpread.pool.dex.name}\n` +
          `Chain: ${bestSpread.chainId}\n` +
          `Swap Size: $${swapAmountUsd.toFixed(2)}\n` +
          `Spread: ${confirmedSpread.spreadPercent.toFixed(2)}% (${confirmedSpreadInBips.toFixed(0)} bips)\n` +
          `Spread USD: $${confirmedSpread.spreadUsd.toFixed(2)}\n` +
          `Profitable: ${confirmedSpread.profitable}\n`
        );
        await this.logger.log(
          `🚨 PROFITABLE SPREAD DETECTED 🚨\n` +
          `Strategy: ${swapData.strategy.type}\n` +
          `Direction: ${swapDirection}\n` +
          `Pool: ${bestSpread.pool.poolAddress}\n` +
          `DEX: ${bestSpread.pool.dex.name}\n` +
          `Chain: ${bestSpread.chainId}\n` +
          `Swap Size: $${swapAmountUsd.toFixed(2)}\n` +
          `Spread: ${confirmedSpread.spreadPercent.toFixed(2)}% (${confirmedSpreadInBips.toFixed(0)} bips)\n` +
          `Spread USD: $${confirmedSpread.spreadUsd.toFixed(2)}\n` +
          `Profitable: ${confirmedSpread.profitable}`,
          "warn"
        );
      } else {
        await this.logger.log(
          `Confirmed spread ${confirmedSpreadInBips.toFixed(0)} bips is below threshold ${this.SPREAD_SIZE_IN_BIPS} bips`
        );
      }
      return {
        success: true,
        quotesChecked: allQuotes.length,
        bestSpreadBips: confirmedSpreadInBips,
        profitable: confirmedSpreadInBips > this.SPREAD_SIZE_IN_BIPS
      };
    } catch (error) {
      await this.logger.log(
        `Failed to process strategy swap event: ${error.message}`,
        "error"
      );
      throw error;
    }
  }
}
