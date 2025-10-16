import { Injectable } from "@nestjs/common";
import { createPublicClient, webSocket, Block } from "viem";
import { LoggerService } from "../../../logger/logger.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

export interface BlockEvent {
  chainId: number;
  blockNumber: string;
  timestamp: string;
  hash: string;
}

export interface SwapEvent {
  chainId: number;
  blockNumber: string;
  timestamp: string;
  hash: string;
  senderAddress: string;
  fromToken: string;
  toToken: string;
  fromTokenAmount: string; // Hex string representation for serialization
  toTokenAmount: string; // Hex string representation for serialization
  poolAddress: string;
}

/**
 * BlockWorkerService manages WebSocket connection to a single EVM chain
 * and listens for new block events, publishing them to a message queue.
 */
@Injectable()
export class BlockWorkerService {
  private client: any;
  private unsubscribe: (() => void) | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  constructor(
    private readonly chainId: number,
    private readonly rpcUrl: string,
    private readonly logger: LoggerService,
    @InjectQueue("block-events") private readonly blockQueue: Queue
  ) {}

  /**
   * Start listening to new blocks on the configured chain
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.log(
        `Block worker for chain ${this.chainId} is already running`,
        "warn"
      );
      return;
    }

    try {
      await this.connect();
      this.isRunning = true;
      this.reconnectAttempts = 0;
      this.logger.log(
        `Block worker started for chain ${this.chainId} at ${this.rpcUrl}`
      );
    } catch (error) {
      this.logger.log(
        `Failed to start block worker for chain ${this.chainId}: ${error.message}`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Stop the block listener and cleanup resources
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.client) {
      try {
        await this.client.transport.close();
      } catch (error) {
        this.logger.log(
          `Error closing WebSocket for chain ${this.chainId}: ${error.message}`,
          "warn"
        );
      }
      this.client = null;
    }

    this.logger.log(`Block worker stopped for chain ${this.chainId}`);
  }

  /**
   * Check if the worker is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Establish WebSocket connection and subscribe to new blocks
   */
  private async connect(): Promise<void> {
    try {
      // Create WebSocket transport
      const transport = webSocket(this.rpcUrl, {
        reconnect: true,
        retryDelay: this.RECONNECT_DELAY,
      });

      // Create public client with WebSocket transport
      this.client = createPublicClient({
        transport,
      });

      // Subscribe to new blocks
      this.unsubscribe = await this.client.watchBlocks({
        onBlock: async (block: Block) => {
          await this.handleNewBlock(block);
        },
        onError: (error: Error) => {
          this.handleError(error);
        },
        includeTransactions: false, // We only need block metadata
        emitOnBegin: false, // Don't emit the current block immediately
      });
    } catch (error) {
      this.logger.log(
        `Failed to connect to chain ${this.chainId}: ${error.message}`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Handle new block event
   * Reason: Extracts essential block data and publishes to message queue for downstream processing
   */
  private async handleNewBlock(block: Block): Promise<void> {
    try {
      // Get all event logs for this block
      const logs = await this.client.getLogs({
        fromBlock: block.number,
        toBlock: block.number,
      });
      const swapEvents: SwapEvent[] = [];
      for (const [index, log] of logs.entries()) {
         if (log.topics?.length && log.topics[0]?.toLowerCase() === "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67") {
          const fromToken = logs[index + 1].address;
          const toToken = logs[index + 2].address;
          // Reason: Keep as hex strings for JSON serialization, convert to BigInt in processor if needed
          const fromTokenAmount = logs[index + 1].data;
          const toTokenAmount = logs[index + 2].data;
          swapEvents.push({
            chainId: this.chainId,
            blockNumber: block.number.toString(),
            timestamp: block.timestamp.toString(),
            hash: block.hash,
            senderAddress: log.topics[1],
            fromToken: fromToken,
            toToken: toToken,
            fromTokenAmount: fromTokenAmount,
            toTokenAmount: toTokenAmount,
            poolAddress: log.address,
          });
        }
      }

      for (const swapEvent of swapEvents) {
        await this.blockQueue.add("new-swap", swapEvent, {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        });
      }

      this.logger.log(
        `New block on chain ${this.chainId}: #${block.number.toString()}`
      );
    } catch (error) {
      this.logger.log(
        `Failed to handle block for chain ${this.chainId}: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Handle connection errors and implement reconnection logic
   * Reason: Ensures resilient operation by attempting to reconnect on connection failures
   */
  private handleError(error: Error): void {
    this.logger.log(
      `WebSocket error for chain ${this.chainId}: ${error.message}`,
      "error"
    );

    // Attempt to reconnect if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.logger.log(
        `Attempting to reconnect to chain ${this.chainId} (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`,
        "warn"
      );

      setTimeout(async () => {
        if (this.isRunning) {
          try {
            await this.stop();
            await this.start();
          } catch (reconnectError) {
            this.logger.log(
              `Reconnection failed for chain ${this.chainId}: ${reconnectError.message}`,
              "error"
            );
          }
        }
      }, this.RECONNECT_DELAY);
    } else {
      this.logger.log(
        `Max reconnection attempts reached for chain ${this.chainId}. Worker stopped.`,
        "error"
      );
      this.stop();
    }
  }
}
