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
  blockTimestamp: number;
  timestamp: number;
  hash: string;
  senderAddress: string;
  fromTokenAmount: string; // String representation of int256 (can be negative)
  toTokenAmount: string; // String representation of int256 (can be negative)
  poolAddress: string;
  dex: string;
}

export interface UniswapSwapEvent extends SwapEvent {
  sqrtPriceX96: string;
}

const UNISWAP_V2_SWAP_EVENT_TOPIC = "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
const UNISWAP_V3_SWAP_EVENT_TOPIC = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";
const UNISWAP_V4_SWAP_EVENT_TOPIC = "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";
const PANCAKE_V3_EVENT_TOPIC      = "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83";

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
      for (const log of logs) {
        if (log.topics?.length) {
          const topic0 = log.topics[0]?.toLowerCase();
          const data = log.data.substring(2); // Remove the 0x prefix
          switch (topic0) {
            case UNISWAP_V2_SWAP_EVENT_TOPIC:
              const amount0In: string = data.slice(0, 64);
              const amount1In: string = data.slice(64, 128);
              const amount0Out: string = data.slice(128, 192);
              const amount1Out: string = data.slice(192, 256);
              const fromTokenAmount = BigInt('0x' + amount0In) > 0n ? '0x' + amount0In : '0x' + amount1In;
              const toTokenAmount = BigInt('0x' + amount0Out) > 0n ? '0x' + amount0Out : '0x' + amount1Out;
              const uniswapV2SwapEvent: SwapEvent = {
                chainId: this.chainId,
                blockNumber: block.number.toString(),
                blockTimestamp: Number(block.timestamp),
                timestamp: Date.now(),
                hash: block.hash,
                senderAddress: log.topics[1],
                fromTokenAmount: BigInt(fromTokenAmount).toString(),
                toTokenAmount: BigInt(toTokenAmount).toString(),
                poolAddress: log.address,
                dex: "uniswapV2",
              };
              swapEvents.push(uniswapV2SwapEvent);
              break;
            case UNISWAP_V3_SWAP_EVENT_TOPIC:
            // Decode signed int256 values (two's complement)
            const amount0 = this.decodeInt256('0x' + data.slice(0, 64));
            const amount1 = this.decodeInt256('0x' + data.slice(64, 128));
            
            const uniswapV3SwapEvent: UniswapSwapEvent = {
              chainId: this.chainId,
              blockNumber: block.number.toString(),
              blockTimestamp: Number(block.timestamp),
              timestamp: Date.now(),
              hash: block.hash,
              senderAddress: log.topics[1],
              fromTokenAmount: amount0.toString(),
              toTokenAmount: amount1.toString(),
              poolAddress: log.address,
              dex: "uniswapV3",
              sqrtPriceX96: '0x' + data.slice(128, 192),

            };
            swapEvents.push(uniswapV3SwapEvent);
            break;
            case UNISWAP_V4_SWAP_EVENT_TOPIC:
              // Decode signed int256 values (two's complement)
              const v4Amount0 = this.decodeInt256('0x' + data.slice(0, 64));
              const v4Amount1 = this.decodeInt256('0x' + data.slice(64, 128));
              
              const uniswapV4SwapEvent: UniswapSwapEvent = {
                chainId: this.chainId,
                blockNumber: block.number.toString(),
                blockTimestamp: Number(block.timestamp),
                timestamp: Date.now(),
                hash: block.hash,
                senderAddress: log.topics[2],
                fromTokenAmount: v4Amount0.toString(),
                toTokenAmount: v4Amount1.toString(),
                poolAddress: log.topics[1],
                dex: "uniswapV4",
                sqrtPriceX96: '0x' + data.slice(128, 192),
              };
              swapEvents.push(uniswapV4SwapEvent);
              break;
            case PANCAKE_V3_EVENT_TOPIC:
              // Decode signed int256 values (two's complement)
              const pancakeAmount0 = this.decodeInt256('0x' + data.slice(0, 64));
              const pancakeAmount1 = this.decodeInt256('0x' + data.slice(64, 128));
              
              const pancakeV3SwapEvent: UniswapSwapEvent = {
                chainId: this.chainId,
                blockNumber: block.number.toString(),
                blockTimestamp: Number(block.timestamp),
                timestamp: Date.now(),
                hash: block.hash,
                senderAddress: log.topics[1],
                fromTokenAmount: pancakeAmount0.toString(),
                toTokenAmount: pancakeAmount1.toString(),
                poolAddress: log.address,
                dex: "pancakeV3",
                sqrtPriceX96: '0x' + data.slice(128, 192),
              };
              swapEvents.push(pancakeV3SwapEvent);
              break;
            default:
              break;
          }
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

  /**
   * Decodes a bytes32 hex string as a signed int256 (two's complement).
   * Handles negative numbers that are padded with 'ffffff...'
   * 
   * @param hex - Hex string (with or without '0x' prefix)
   * @returns Decoded bigint value (can be negative)
   */
  private decodeInt256(hex: string): bigint {
    // Remove '0x' prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Parse as unsigned bigint first
    const unsigned = BigInt('0x' + cleanHex);
    
    // Check if the most significant bit is set (negative number in two's complement)
    // For 256-bit numbers, check if bit 255 is set
    const maxInt256 = BigInt(2) ** BigInt(256);
    const signBit = BigInt(2) ** BigInt(255);
    
    if (unsigned >= signBit) {
      // Negative number: convert from two's complement
      // Formula: value - 2^256
      return unsigned - maxInt256;
    }
    
    // Positive number
    return unsigned;
  }
}




// {
//   "chainId": 1,
//   "rpcUrl": "wss://eth-mainnet.g.alchemy.com/v2/YAPib3PJfBOjlj9pkJwU3MoVW7t3G2uX"
// },