import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { LoggerService } from "../../../../logger/logger.service";
import { BlockEvent } from "../block-worker.service";

/**
 * Example processor for consuming block events from the queue.
 * You can create your own processors to handle block events for your specific use cases.
 */
@Processor("block-events")
export class BlockEventsProcessor {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Process new block events
   * Reason: Central handler for all block notifications across all monitored chains
   */
  @Process("new-block")
  async handleNewBlock(job: Job<BlockEvent>) {
    const { chainId, blockNumber, timestamp, hash } = job.data;

    try {
      this.logger.log(
        `Processing block event - Chain: ${chainId}, Block: #${blockNumber.toString()}, Hash: ${hash}`
      );

      // Example: Add your custom logic here
      // - Fetch transactions from the block
      // - Monitor for specific events
      // - Update internal state
      // - Trigger other workflows

      // Example timestamp conversion
      const blockDate = new Date(Number(timestamp) * 1000);
      this.logger.log(
        `Block timestamp: ${blockDate.toISOString()}`
      );

      // Return success
      return { success: true, chainId, blockNumber: blockNumber.toString() };
    } catch (error) {
      this.logger.log(
        `Failed to process block ${blockNumber.toString()} on chain ${chainId}: ${error.message}`,
        "error"
      );
      throw error; // Bull will retry based on job options
    }
  }

  /**
   * Process new swap events
   * Reason: Handler for swap events detected in monitored blocks
   */
  @Process("new-swap")
  async handleNewSwap(job: Job<any>) {
    try {
      const swapData = job.data;
      
      // Reason: Convert hex string amounts to BigInt for calculations
      const fromAmount = BigInt(swapData.fromTokenAmount);
      const toAmount = BigInt(swapData.toTokenAmount);
      
      this.logger.log(
        `Swap detected - Chain: ${swapData.chainId}, Pool: ${swapData.poolAddress}, ` +
        `From: ${swapData.fromToken} (${fromAmount.toString()}), ` +
        `To: ${swapData.toToken} (${toAmount.toString()})`
      );
      
      return { success: true };
    } catch (error) {
      this.logger.log(
        `Failed to process swap event: ${error.message}`,
        "error"
      );
      throw error; // Bull will retry based on job options
    }
  }
}

