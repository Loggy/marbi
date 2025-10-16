import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { LoggerService } from "../../../logger/logger.service";
import { BlockWorkerService } from "./block-worker.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
}

/**
 * EVMListenerService manages multiple block workers, one for each configured EVM chain.
 * It handles initialization, worker lifecycle, and provides management interfaces.
 */
@Injectable()
export class EVMListenerService implements OnModuleInit, OnModuleDestroy {
  private workers: Map<number, BlockWorkerService> = new Map();
  private chainConfigs: Map<number, string> = new Map();

  constructor(
    private readonly logger: LoggerService,
    @InjectQueue("block-events") private readonly blockQueue: Queue
  ) {}

  /**
   * Initialize workers on module startup
   */
  async onModuleInit() {
    this.logger.log("EVM Listener Service initializing...");
    
    // Workers will be initialized when chains are configured
    // Either via configuration endpoint or environment variables
    await this.initializeFromEnv();
  }

  /**
   * Cleanup all workers on module destroy
   */
  async onModuleDestroy() {
    this.logger.log("EVM Listener Service shutting down...");
    await this.stopAllWorkers();
  }

  /**
   * Initialize workers from environment variables if available
   * Reason: Allows automatic startup of pre-configured chains without manual API calls
   */
  private async initializeFromEnv(): Promise<void> {
    try {
      // Check for chain configurations in environment
      // Format: EVM_LISTENER_CHAINS={"1":"wss://eth-mainnet.ws","56":"wss://bsc-mainnet.ws"}
      const envChains = process.env.EVM_LISTENER_CHAINS;
      
      if (envChains) {
        const chains: Record<string, string> = JSON.parse(envChains);
        const configs: ChainConfig[] = Object.entries(chains).map(([chainId, rpcUrl]) => ({
          chainId: parseInt(chainId),
          rpcUrl,
        }));

        await this.configureChains(configs);
        this.logger.log(`Initialized ${configs.length} chain listeners from environment`);
      } else {
        this.logger.log("No chain configurations found in environment. Waiting for manual configuration.", "info");
      }
    } catch (error) {
      this.logger.log(
        `Failed to initialize from environment: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Configure and start workers for multiple chains
   */
  async configureChains(configs: ChainConfig[]): Promise<void> {
    for (const config of configs) {
      await this.addChain(config.chainId, config.rpcUrl);
    }
  }

  /**
   * Add a new chain to monitor
   */
  async addChain(chainId: number, rpcUrl: string): Promise<boolean> {
    try {
      // Check if worker already exists
      if (this.workers.has(chainId)) {
        this.logger.log(
          `Worker for chain ${chainId} already exists. Stopping old worker first.`,
          "warn"
        );
        await this.removeChain(chainId);
      }

      // Validate WebSocket URL
      if (!rpcUrl.startsWith("ws://") && !rpcUrl.startsWith("wss://")) {
        throw new Error(`Invalid WebSocket URL: ${rpcUrl}. Must start with ws:// or wss://`);
      }

      // Store configuration
      this.chainConfigs.set(chainId, rpcUrl);

      // Create and start worker
      const worker = new BlockWorkerService(
        chainId,
        rpcUrl,
        this.logger,
        this.blockQueue
      );

      await worker.start();
      this.workers.set(chainId, worker);

      this.logger.log(`Successfully added and started worker for chain ${chainId}`);
      return true;
    } catch (error) {
      this.logger.log(
        `Failed to add chain ${chainId}: ${error.message}`,
        "error"
      );
      return false;
    }
  }

  /**
   * Remove and stop a chain worker
   */
  async removeChain(chainId: number): Promise<boolean> {
    try {
      const worker = this.workers.get(chainId);
      
      if (!worker) {
        this.logger.log(`No worker found for chain ${chainId}`, "warn");
        return false;
      }

      await worker.stop();
      this.workers.delete(chainId);
      this.chainConfigs.delete(chainId);

      this.logger.log(`Successfully removed worker for chain ${chainId}`);
      return true;
    } catch (error) {
      this.logger.log(
        `Failed to remove chain ${chainId}: ${error.message}`,
        "error"
      );
      return false;
    }
  }

  /**
   * Stop all running workers
   */
  async stopAllWorkers(): Promise<void> {
    const chainIds = Array.from(this.workers.keys());
    
    for (const chainId of chainIds) {
      await this.removeChain(chainId);
    }

    this.logger.log("All workers stopped");
  }

  /**
   * Get status of all workers
   */
  getWorkersStatus(): Array<{
    chainId: number;
    rpcUrl: string;
    isActive: boolean;
  }> {
    const status: Array<{
      chainId: number;
      rpcUrl: string;
      isActive: boolean;
    }> = [];

    for (const [chainId, worker] of this.workers.entries()) {
      status.push({
        chainId,
        rpcUrl: this.chainConfigs.get(chainId) || "unknown",
        isActive: worker.isActive(),
      });
    }

    return status;
  }

  /**
   * Get status of a specific worker
   */
  getWorkerStatus(chainId: number): {
    chainId: number;
    rpcUrl: string;
    isActive: boolean;
  } | null {
    const worker = this.workers.get(chainId);
    
    if (!worker) {
      return null;
    }

    return {
      chainId,
      rpcUrl: this.chainConfigs.get(chainId) || "unknown",
      isActive: worker.isActive(),
    };
  }

  /**
   * Restart a specific worker
   */
  async restartWorker(chainId: number): Promise<boolean> {
    try {
      const rpcUrl = this.chainConfigs.get(chainId);
      
      if (!rpcUrl) {
        this.logger.log(`No configuration found for chain ${chainId}`, "error");
        return false;
      }

      await this.removeChain(chainId);
      await this.addChain(chainId, rpcUrl);

      this.logger.log(`Successfully restarted worker for chain ${chainId}`);
      return true;
    } catch (error) {
      this.logger.log(
        `Failed to restart worker for chain ${chainId}: ${error.message}`,
        "error"
      );
      return false;
    }
  }

  /**
   * Get list of configured chain IDs
   */
  getConfiguredChains(): number[] {
    return Array.from(this.chainConfigs.keys());
  }
}

