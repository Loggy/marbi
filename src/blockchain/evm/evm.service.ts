import { Injectable } from "@nestjs/common";
import {
  http,
  createWalletClient,
  WalletClient,
  publicActions,
  type PublicActions,
  erc20Abi,
  maxUint256,
  multicall3Abi,
} from "viem";
import { LoggerService } from "../../logger/logger.service";
import { privateKeyToAccount } from "viem/accounts";
import { executeOkxSwap } from "./providers/okx";
import { base, mainnet, arbitrum, bsc, type Chain } from "viem/chains";
import { OKX_SPENDER_ADDRESSES } from "./providers/okx";
import { EVMSettings } from "../../strategies/dd/dto/initialize-dto";

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

  async initialize(evmSettings: EVMSettings): Promise<any[]> {
    const results = [];

    for (const chain of evmSettings.chains) {
      const client = this.getClient(chain.chainId.toString());
      const spenderAddress =
        OKX_SPENDER_ADDRESSES[
          chain.chainId.toString() as keyof typeof OKX_SPENDER_ADDRESSES
        ];

      if (!spenderAddress) {
        results.push({
          chainId: chain.chainId,
          status: "failed",
          error: "Unsupported chain ID",
        });
        continue;
      }

      try {
        // Prepare multicall calls for all tokens
        const multicallCalls = chain.tokens.flatMap((token) => [
          {
            address: token.tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmSettings.walletAddress as `0x${string}`],
          },
          {
            address: token.tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "allowance",
            args: [evmSettings.walletAddress as `0x${string}`, spenderAddress],
          },
        ]);

        // Execute multicall
        // @ts-ignore
        const multicallResults = await client.multicall({
          contracts: multicallCalls,
        });

        // Process results for each token
        for (let i = 0; i < chain.tokens.length; i++) {
          const token = chain.tokens[i];
          const balance = multicallResults[i * 2].result as bigint;
          const currentAllowance = multicallResults[i * 2 + 1].result as bigint;
          const desiredAllowance = BigInt(token.setAllowance);
          const minAllowance = BigInt(token.minAllowance);

          if (currentAllowance < minAllowance) {
            const hash = await client.writeContract({
              address: token.tokenAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: "approve",
              args: [spenderAddress, desiredAllowance],
              chain: client.chain,
              account: client.account,
            });

            results.push({
              chainId: chain.chainId,
              tokenAddress: token.tokenAddress,
              status: "success",
              txHash: hash,
              balance: balance.toString(),
              newAllowance: desiredAllowance.toString(),
            });
          } else {
            results.push({
              chainId: chain.chainId,
              tokenAddress: token.tokenAddress,
              status: "skipped",
              balance: balance.toString(),
              currentAllowance: currentAllowance.toString(),
              message: "Current allowance is sufficient",
            });
          }
        }
      } catch (error) {
        // If multicall fails, add error result for all tokens in the chain
        chain.tokens.forEach((token) => {
          results.push({
            chainId: chain.chainId,
            tokenAddress: token.tokenAddress,
            status: "failed",
            error: error.message,
          });
        });
      }
    }

    return results;
  }
}
