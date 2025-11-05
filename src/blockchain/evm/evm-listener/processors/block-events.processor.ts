import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { LoggerService } from "../../../../logger/logger.service";
import { PoolService } from "../../../../pool/pool.service";
import { SwapEvent } from "../block-worker.service";

/**
 * Processor for consuming block events from the queue.
 * Enriches swap events with pool data and calculates USD values for stable pairs.
 */
@Processor("block-events")
export class BlockEventsProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly poolService: PoolService
  ) {}

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
      if (hasStableToken) {
        const stableToken = token0IsStable ? pool.token0 : pool.token1;
        const nonStableToken = token0IsStable ? pool.token1 : pool.token0;
        const nonStableAmount = token0IsStable ? token1Amount : token0Amount;
        const stableFormatted = token0IsStable ? token0Formatted : token1Formatted;
        const swapSizeUsd = parseFloat(stableFormatted.replace("-", ""));
        const direction = nonStableAmount < 0n ? "BUY" : "SELL";
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
        this.logger.log(
          `Swap detected (no stable) - Chain: ${swapData.chainId}\n` +
          `Pool: ${swapData.poolAddress}\n` +
          `DEX: ${swapData.dex}\n` +
          `${pool.token0.symbol} Amount: ${token0Formatted}\n` +
          `${pool.token1.symbol} Amount: ${token1Formatted}\n` +
          `Block: ${swapData.blockNumber}`
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

