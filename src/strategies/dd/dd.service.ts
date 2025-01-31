import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../../enities/order.entity";
import { TokenBalance } from "../../enities/token-balance.entity";
import { EVMService } from "../../blockchain/evm/evm.service";
import { SolanaService } from "../../blockchain/solana/solana.service";
import { DexRouterService } from "../../dex-router/dex-router.service";
import { LoggerService } from "../../logger/logger.service";
import { CreateOrderDto, NetworkConfig } from './dto/create-order.dto';

@Injectable()
export class DDService {
  private readonly MAX_RETRIES = 5;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(TokenBalance)
    private tokenBalanceRepository: Repository<TokenBalance>,
    private evmService: EVMService,
    private solanaService: SolanaService,
    private dexRouterService: DexRouterService,
    private logger: LoggerService
  ) {}

  async updateTokenBalance(
    address: string,
    chainId: string,
    decimals: number,
    networkName: string
  ): Promise<TokenBalance> {
    let balance: bigint;
    let tokenDecimals: number;

    if (networkName === 'solana') {
      const tokenInfo = await this.solanaService.getTokenInfo(address);
      tokenDecimals = decimals || tokenInfo.decimals;
    } else {
      balance = await this.evmService.getTokenBalance(
        address,
        process.env.EVM_WALLET_ADDRESS,
        parseInt(chainId)
      );
      tokenDecimals = decimals || await this.evmService.getTokenDecimals(
        address,
        parseInt(networkName)
      );
    }

    const existingBalance = await this.tokenBalanceRepository.findOne({
      where: { address, chainId }
    });

    if (existingBalance) {
      existingBalance.balance = balance.toString();
      existingBalance.decimals = tokenDecimals;
      return await this.tokenBalanceRepository.save(existingBalance);
    } else {
      const newBalance = this.tokenBalanceRepository.create({
        address,
        chainId,
        balance: balance.toString(),
        decimals: tokenDecimals
      });
      return await this.tokenBalanceRepository.save(newBalance);
    }
  }

  private async updateAllTokenBalances(params: CreateOrderDto): Promise<void> {
    const network0 = params.config.Network0;
    const network1 = params.config.Network1;

    // Update Network0 token balances
    await Promise.all([
      this.updateTokenBalance(
        network0.StartTokenAddress,
        network0.NetworkName,
        parseInt(network0.StartTokenDecimals),
        network0.NetworkName
      ),
      this.updateTokenBalance(
        network0.FinishTokenAddress,
        network0.NetworkName,
        parseInt(network0.FinishTokenDecimals),
        network0.NetworkName
      )
    ]);

    // Update Network1 token balances
    await Promise.all([
      this.updateTokenBalance(
        network1.StartTokenAddress,
        network1.NetworkName,
        parseInt(network1.StartTokenDecimals),
        network1.NetworkName
      ),
      this.updateTokenBalance(
        network1.FinishTokenAddress,
        network1.NetworkName,
        parseInt(network1.FinishTokenDecimals),
        network1.NetworkName
      )
    ]);
  }

  private async requestRoute(
    networkConfig: NetworkConfig,
    amount: string,
    networkName: string
  ): Promise<any> {
    await this.logger.log(`Requesting route for ${networkName} with amount ${amount}.`);
    if (networkName === 'solana') {
      return this.dexRouterService.getSolanaRoute({
        fromToken: networkConfig.StartTokenAddress,
        toToken: networkConfig.FinishTokenAddress,
        amount: amount,
        slippage: networkConfig.SlippagePercent,
      });
    } else {
      // EVM swap implementation
      return this.dexRouterService.getEVMRoute({
        fromToken: networkConfig.StartTokenAddress,
        toToken: networkConfig.FinishTokenAddress,
        amount: amount,
        slippage: networkConfig.SlippagePercent,
        chainName: networkConfig.NetworkName,
      });
    }
  }

  private async requestRoutes(params: CreateOrderDto): Promise<{ network0: any; network1: any }> {
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

  private async requestRoutesWithRetry(
    params: CreateOrderDto,
    retries = this.MAX_RETRIES
  ): Promise<{ network0: any; network1: any }> {
    try {
      return await this.requestRoutes(params);
    } catch (error) {
      if (retries > 0) {
        await this.logger.log(
          `Retry attempt ${this.MAX_RETRIES - retries + 1}: ${error.message}`,
          'warn'
        );
        return this.requestRoutesWithRetry(params, retries - 1);
      }
      throw new Error(`Failed after ${this.MAX_RETRIES} retries: ${error.message}`);
    }
  }

  private async executeTransaction(
    route: any,
    networkName: string,
    retries = this.MAX_RETRIES
  ): Promise<any> {
    const execute = async () => {
      if (networkName === 'solana') {
        return this.solanaService.jupSwap(route);
      } else {
        return this.evmService.signAndSendTransaction(
          1, // chainId - should be determined based on network
          route,
          process.env.PRIVATE_KEY
        );
      }
    };

    try {
      return await execute();
    } catch (error) {
      if (retries > 0) {
        await this.logger.log(
          `Retry attempt ${this.MAX_RETRIES - retries + 1} for ${networkName}: ${error.message}`,
          'warn'
        );
        return this.executeTransaction(route, networkName, retries - 1);
      }
      throw new Error(`Failed after ${this.MAX_RETRIES} retries for ${networkName}: ${error.message}`);
    }
  }

  async createOrder(params: CreateOrderDto): Promise<Order> {
    const order = this.orderRepository.create({
      params,
      status: "PENDING",
    });

    await this.logger.log(
      `Creating new DD order for ${params.config.Ticker} with amount ${params.config.Amounts_In[0].amount + params.config.Amounts_In[1].amount} USDC`
    );

    try {
      // First phase: Get routes (retried together)
      const routes = await this.requestRoutesWithRetry(params);
      await this.logger.log(`Routes: ${JSON.stringify(routes)}`);
      // Second phase: Execute transactions (retried separately)
      const [network0Tx, network1Tx] = await Promise.all([
        this.executeTransaction(routes.network0, params.config.Network0.NetworkName),
        this.executeTransaction(routes.network1, params.config.Network1.NetworkName),
      ]);

      // Update token balances after successful execution
      await this.updateAllTokenBalances(params);

      order.status = "COMPLETED";
      order.result = {
        network0: {
          route: routes.network0,
          transaction: network0Tx,
        },
        network1: {
          route: routes.network1,
          transaction: network1Tx,
        },
      };
    } catch (error) {
      order.status = "FAILED";
      order.result = {
        error: error.message,
      };
      await this.logger.log(`Order failed: ${error.message}`, 'error');
    }

    return await this.orderRepository.save(order);
  }
}
