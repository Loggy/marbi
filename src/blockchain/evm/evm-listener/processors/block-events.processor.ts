import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import * as Bull from "bull";
import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { LoggerService } from "../../../../logger/logger.service";
import { PoolService } from "../../../../pool/pool.service";
import { BybitPriceService } from "../../../../shared/services/bybit-price.service";
import { SwapEvent } from "../block-worker.service";

/**
 * Processor for consuming block events from the queue.
 * Enriches swap events with pool data and calculates USD values for stable pairs.
 * Fetches ETH and BTC prices every 30 seconds for non-stable pair valuation.
 * Routes swaps to strategy-specific queues if pool belongs to a strategy.
 */
@Processor("block-events")
export class BlockEventsProcessor implements OnModuleInit, OnModuleDestroy {
  private ethPrice: number = 0;
  private btcPrice: number = 0;
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private readonly PRICE_UPDATE_INTERVAL = 30000;
  private strategyQueues: Map<string, Bull.Queue> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly poolService: PoolService,
    private readonly bybitPriceService: BybitPriceService
  ) {}

  /**
   * Initialize price fetching on module startup
   * Reason: Sets up interval to fetch ETH and BTC prices every 30 seconds
   */
  async onModuleInit() {
    await this.updatePrices();
    this.priceUpdateInterval = setInterval(async () => {
      await this.updatePrices();
    }, this.PRICE_UPDATE_INTERVAL);
    this.logger.log("BlockEventsProcessor initialized with price fetching");
  }

  /**
   * Clean up interval on module shutdown
   * Reason: Prevents memory leaks by clearing the interval timer
   */
  async onModuleDestroy() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    for (const [queueName, queue] of this.strategyQueues.entries()) {
      await queue.close();
      this.logger.log(`Closed strategy queue: ${queueName}`);
    }
    this.strategyQueues.clear();
    this.logger.log("BlockEventsProcessor destroyed");
  }

  /**
   * Get or create a Bull queue for a specific strategy type
   * Reason: Dynamically creates queues for different strategy types to route swaps
   */
  private getStrategyQueue(strategyType: string): Bull.Queue {
    const queueName = `strategy-${strategyType}`;
    if (!this.strategyQueues.has(queueName)) {
      const queue = new Bull(queueName, {
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
        },
      });
      this.strategyQueues.set(queueName, queue);
      this.logger.log(`Created new strategy queue: ${queueName}`);
    }
    return this.strategyQueues.get(queueName)!;
  }

  /**
   * Fetch current ETH and BTC prices from Bybit
   * Reason: Updates cached prices for USD valuation of non-stable swaps
   */
  private async updatePrices(): Promise<void> {
    try {
      const [ethPriceStr, btcPriceStr] = await Promise.all([
        this.bybitPriceService.getPrice("ETH"),
        this.bybitPriceService.getPrice("BTC"),
      ]);
      this.ethPrice = parseFloat(ethPriceStr);
      this.btcPrice = parseFloat(btcPriceStr);
      this.logger.log(
        `Prices updated - ETH: $${this.ethPrice.toFixed(2)}, BTC: $${this.btcPrice.toFixed(2)}`
      );
    } catch (error) {
      this.logger.log(
        `Failed to update prices: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Get price for a token symbol
   * Reason: Maps token symbols to cached prices
   */
  private getTokenPrice(symbol: string): number | null {
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol === "WETH" || upperSymbol === "ETH") {
      return this.ethPrice;
    }
    if (upperSymbol === "WBTC" || upperSymbol === "BTC") {
      return this.btcPrice;
    }
    return null;
  }

  /**
   * Process new swap events with enhanced pool and token analysis
   * Reason: Enriches swap data with database pool information and calculates USD values
   */
  @Process("new-swap")
  async handleNewSwap(job: Job<SwapEvent>) {
    try {
      const swapData = job.data;
      const pool = await this.poolService.findPoolByAddress(
        swapData.poolAddress,
        swapData.chainId
      );
      if (!pool) {
        return { success: true, skipped: true, reason: "pool_not_found" };
      }
      const token0IsStable = pool.token0.stable === true;
      const token1IsStable = pool.token1.stable === true;
      const hasStableToken = token0IsStable || token1IsStable;
      const token0Amount = BigInt(swapData.token0Amount);
      const token1Amount = BigInt(swapData.token1Amount);
      const token0Decimals = pool.token0.addresses?.find(
        (addr) => addr.chainId === swapData.chainId
      )?.decimals || 18;
      const token1Decimals = pool.token1.addresses?.find(
        (addr) => addr.chainId === swapData.chainId
      )?.decimals || 18;
      const formatAmount = (amount: bigint, decimals: number): string => {
        const isNegative = amount < 0n;
        const absoluteAmount = isNegative ? -amount : amount;
        const divisor = 10n ** BigInt(decimals);
        const integerPart = absoluteAmount / divisor;
        const fractionalPart = absoluteAmount % divisor;
        const fractionalString = fractionalPart.toString().padStart(decimals, "0");
        const trimmedFractional = fractionalString.slice(0, 6).replace(/0+$/, "");
        const sign = isNegative ? "-" : "";
        return trimmedFractional.length > 0
          ? `${sign}${integerPart}.${trimmedFractional}`
          : `${sign}${integerPart}`;
      };
      const token0Formatted = formatAmount(token0Amount, token0Decimals);
      const token1Formatted = formatAmount(token1Amount, token1Decimals);
      const enrichedData: any = {
        ...swapData,
        poolId: pool.id,
        pool: {
          address: pool.poolAddress,
          dexName: pool.dex.name,
          fee: pool.fee,
        },
        token0: {
          id: pool.token0.id,
          symbol: pool.token0.symbol,
          name: pool.token0.name,
          address: pool.token0Address,
          decimals: token0Decimals,
          amount: swapData.token0Amount,
          amountFormatted: token0Formatted,
          isStable: token0IsStable,
        },
        token1: {
          id: pool.token1.id,
          symbol: pool.token1.symbol,
          name: pool.token1.name,
          address: pool.token1Address,
          decimals: token1Decimals,
          amount: swapData.token1Amount,
          amountFormatted: token1Formatted,
          isStable: token1IsStable,
        },
        prices: {
          ethPrice: this.ethPrice,
          btcPrice: this.btcPrice,
        },
      };
      if (hasStableToken) {
        const stableToken = token0IsStable ? pool.token0 : pool.token1;
        const nonStableToken = token0IsStable ? pool.token1 : pool.token0;
        const nonStableAmount = token0IsStable ? token1Amount : token0Amount;
        const stableFormatted = token0IsStable ? token0Formatted : token1Formatted;
        const swapSizeUsd = parseFloat(stableFormatted.replace("-", ""));
        const direction = nonStableAmount < 0n ? "BUY" : "SELL";
        enrichedData.analysis = {
          hasStableToken: true,
          stableToken: stableToken.symbol,
          nonStableToken: nonStableToken.symbol,
          swapSizeUsd,
          direction,
        };
        this.logger.log(
          `Swap detected - Chain: ${swapData.chainId}\n` +
          `Pool: ${swapData.poolAddress}\n` +
          `DEX: ${swapData.dex}\n` +
          `Stable Token: ${stableToken.symbol}\n` +
          `Non-Stable Token: ${nonStableToken.symbol}\n` +
          `Swap Size: $${swapSizeUsd.toFixed(2)}\n` +
          `Direction: ${direction} ${nonStableToken.symbol}\n` +
          `${pool.token0.symbol} Amount: ${token0Formatted}\n` +
          `${pool.token1.symbol} Amount: ${token1Formatted}\n` +
          `Block: ${swapData.blockNumber}`
        );
      } else {
        const token0Price = this.getTokenPrice(pool.token0.symbol);
        const token1Price = this.getTokenPrice(pool.token1.symbol);
        if (token0Price || token1Price) {
          const pricedToken = token0Price ? pool.token0 : pool.token1;
          const otherToken = token0Price ? pool.token1 : pool.token0;
          const otherAmount = token0Price ? token1Amount : token0Amount;
          const pricedFormatted = token0Price ? token0Formatted : token1Formatted;
          const tokenPrice = token0Price || token1Price;
          const swapSizeUsd = parseFloat(pricedFormatted.replace("-", "")) * tokenPrice;
          const direction = otherAmount < 0n ? "BUY" : "SELL";
          enrichedData.analysis = {
            hasStableToken: false,
            pricedToken: pricedToken.symbol,
            pricedTokenPrice: tokenPrice,
            otherToken: otherToken.symbol,
            swapSizeUsd,
            direction,
          };
          this.logger.log(
            `Swap detected - Chain: ${swapData.chainId}\n` +
            `Pool: ${swapData.poolAddress}\n` +
            `DEX: ${swapData.dex}\n` +
            `Priced Token: ${pricedToken.symbol} (${tokenPrice.toFixed(2)} USD)\n` +
            `Other Token: ${otherToken.symbol}\n` +
            `Swap Size: $${swapSizeUsd.toFixed(2)}\n` +
            `Direction: ${direction} ${otherToken.symbol}\n` +
            `${pool.token0.symbol} Amount: ${token0Formatted}\n` +
            `${pool.token1.symbol} Amount: ${token1Formatted}\n` +
            `Block: ${swapData.blockNumber}`
          );
        } else {
          enrichedData.analysis = {
            hasStableToken: false,
            pricedToken: null,
            swapSizeUsd: null,
            direction: null,
          };
          this.logger.log(
            `Swap detected (no stable) - Chain: ${swapData.chainId}\n` +
            `Pool: ${swapData.poolAddress}\n` +
            `DEX: ${swapData.dex}\n` +
            `${pool.token0.symbol} Amount: ${token0Formatted}\n` +
            `${pool.token1.symbol} Amount: ${token1Formatted}\n` +
            `Block: ${swapData.blockNumber}`
          );
        }
      }
      if (pool.strategy) {
        enrichedData.strategy = {
          id: pool.strategy.id,
          type: pool.strategy.type,
        };
        const strategyQueue = this.getStrategyQueue(pool.strategy.type);
        await strategyQueue.add("swap-event", enrichedData);
        this.logger.log(
          `Routed swap to strategy queue: strategy-${pool.strategy.type} (Pool: ${pool.poolAddress}, Swap Size: ${enrichedData.analysis?.swapSizeUsd ? '$' + enrichedData.analysis.swapSizeUsd.toFixed(2) : 'N/A'})`
        );
      }
      return { success: true };
    } catch (error) {
      this.logger.log(
        `Failed to process swap event: ${error.message}`,
        "error"
      );
      throw error;
    }
  }
}

