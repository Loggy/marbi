import { Injectable } from "@nestjs/common";
import {
  createPublicClient,
  http,
  PublicClient,
  createWalletClient,
  WalletClient,
} from "viem";
import { LoggerService } from "../../logger/logger.service";
import { executeOkxSwap } from "./providers/okx";
import { run } from "./providers/okx/test";

@Injectable()
export class EVMService {
  private client: Map<number, PublicClient> = new Map();
  private walletClients: Map<number, WalletClient> = new Map();

  constructor(private readonly logger: LoggerService) {}

  private getClient(chainId: number): PublicClient {
    if (!this.client.has(chainId)) {
      const client = createPublicClient({
        transport: http(process.env[`RPC_URL_${chainId}`]),
      });
      this.client.set(chainId, client);
    }
    return this.client.get(chainId);
  }

  async getNativeBalance(address: string, chainId: number): Promise<bigint> {
    const client = this.getClient(chainId);
    return await client.getBalance({ address: address as `0x${string}` });
  }

  async getTokenBalance(
    tokenAddress: string,
    address: string,
    chainId: number
  ): Promise<bigint> {
    const client = this.getClient(chainId);
    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    return balance;
  }

  async signAndSendTransaction(
    chainId: number,
    transaction: any,
    privateKey: string
  ): Promise<string> {
    // Implementation depends on your specific needs
    // This is a basic example
    try {
      // Create wallet client if doesn't exist
      if (!this.walletClients.has(chainId)) {
        const client = createWalletClient({
          transport: http(process.env[`RPC_URL_${chainId}`]),
        });
        this.walletClients.set(chainId, client);
      }

      // Send transaction logic here
      // Return transaction hash
      return "0x...";
    } catch (error) {
      await this.logger.log(
        `Failed to send EVM transaction: ${error.message}`,
        "error"
      );
      throw error;
    }
  }

  async okxSwap(params: any): Promise<any> {
    return await executeOkxSwap(params);
    console.log(params);
    // await sendAndSwapViem(params);
    return "ok";
  }
}
