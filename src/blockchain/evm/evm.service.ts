import { Injectable } from "@nestjs/common";
import {
  http,
  createWalletClient,
  WalletClient,
  publicActions,
  type PublicActions,
  erc20Abi,
} from "viem";
import { LoggerService } from "../../logger/logger.service";
import { privateKeyToAccount } from "viem/accounts";
import { executeOkxSwap } from "./providers/okx";
import { base, mainnet, arbitrum, bsc, type Chain } from "viem/chains";

const createViemClient = (chain: Chain, rpcUrl: string) => {
  return createWalletClient({
    chain: chain,
    transport: http(rpcUrl),
    account: privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`),
  }).extend(publicActions);
};

// Define a type for the chain clients to avoid inference issues
type ChainClients = {
  [K in "1" | "8453" | "42161" | "56"]: WalletClient & PublicActions;
};

const CHAIN_CLIENTS: ChainClients = {
  "1": createViemClient(mainnet, process.env.MAINNET_RPC_URL as string),
  "8453": createViemClient(base, process.env.BASE_RPC_URL as string),
  "42161": createViemClient(arbitrum, process.env.ARBITRUM_RPC_URL as string),
  "56": createViemClient(bsc, process.env.BSC_RPC_URL as string),
};

// Update the WalletClientConfig type to use our new ChainClients type
export type WalletClientConfig = ChainClients[keyof ChainClients];

@Injectable()
export class EVMService {
  constructor(private readonly logger: LoggerService) {}

  private getClient(chainId: string | number): WalletClientConfig {
    const chainIdStr = chainId.toString();
    if (chainIdStr in CHAIN_CLIENTS) {
      return CHAIN_CLIENTS[chainIdStr as keyof ChainClients];
    }
    throw new Error(`Chain ID ${chainId} is not supported`);
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
      abi: erc20Abi,
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
      const client = this.getClient(chainId);

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

  async getTokenDecimals(
    tokenAddress: string,
    chainId: number
  ): Promise<number> {
    const client = this.getClient(chainId);
    const decimals = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "decimals",
    });
    return decimals;
  }

  async executeSwap(params: any): Promise<any> {
    return await executeOkxSwap({
      ...params,
      client: this.getClient(params.chainId),
    });
  }
}
