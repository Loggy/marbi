import { Injectable } from "@nestjs/common";
import {
  http,
  createWalletClient,
  WalletClient,
  publicActions,
  type PublicActions,
  erc20Abi,
  Address,
  createPublicClient,
  PublicClient,
} from "viem";
import { LoggerService } from "../../logger/logger.service";
import { privateKeyToAccount } from "viem/accounts";
import {
  executeOkxSwap,
  EVMSwapParams,
  OKX_SPENDER_ADDRESSES,
  getOKXSupportedChains,
} from "./providers/okx";
import { base, mainnet, arbitrum, bsc, type Chain } from "viem/chains";
import { EVMSettings, EVMTokenInfo } from "../../settings/dto/initialize.dto";
import { TokenBalance } from "src/entities/token-balance.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

const createViemClient = (chain: Chain, rpcUrl: string) => {
  const transport = http(rpcUrl);
  return createWalletClient({
    chain: chain,
    transport,
  }).extend(publicActions);
};

// Define a type for the chain clients to avoid inference issues
type ChainClients = {
  [K in "1" | "8453" | "42161" | "56"]: WalletClient & PublicActions;
};

export const EVM_SPENDER_ADDRESSES = OKX_SPENDER_ADDRESSES;

const CHAIN_CLIENTS: ChainClients = {
  "1": createViemClient(mainnet, process.env.MAINNET_RPC_URL as string),
  "8453": createViemClient(base, base.rpcUrls.default.http[0] as string),
  "42161": createViemClient(arbitrum, process.env.ARBITRUM_RPC_URL as string),
  "56": createViemClient(bsc, process.env.BSC_RPC_URL as string),
};

const CHAIN_NAME_TO_ID = {
  mainnet: "1",
  base: "8453",
  arbitrum: "42161",
  bsc: "56",
};

export function getChainIdByName(chainName: string) {
  const chainId = CHAIN_NAME_TO_ID[chainName as keyof typeof CHAIN_NAME_TO_ID];
  if (!chainId) {
    throw new Error(`Chain name ${chainName} is not supported`);
  }
  return chainId;
}

// Update the WalletClientConfig type to use our new ChainClients type
export type WalletClientConfig = ChainClients[keyof ChainClients];

@Injectable()
export class EVMService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(TokenBalance)
    private readonly tokenBalanceRepository: Repository<TokenBalance>
  ) {}

  // async onModuleInit() {
  // const responses = [];
  // const supportedChainsIds = Object.keys(CHAIN_CLIENTS);
  // for (const chainId of supportedChainsIds) {
  //   const chains = await getOKXSupportedChains(chainId);
  //   responses.push(chains);

  //   await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
  // }
  // this.logger.log(`Supported chains: ${JSON.stringify(responses)}`, "info");
  // }

  private getClient(
    chainId: string | number,
    privateKey?: string
  ): WalletClientConfig {
    try {
      const chainIdStr = chainId.toString(); 
      if (chainIdStr in CHAIN_CLIENTS) {
        if (privateKey) {
          // Create a new client with the provided private key
          const baseClient = CHAIN_CLIENTS[chainIdStr as keyof ChainClients];
          return createWalletClient({ 
            chain: baseClient.chain,
            transport: http(baseClient.transport.url), // Create new transport with the same URL
            account: privateKeyToAccount(privateKey as `0x${string}`),
          }).extend(publicActions);
        }
        return CHAIN_CLIENTS[chainIdStr as keyof ChainClients];
      }
    } catch (error) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }
  }

  async getNativeBalance(address: string, chainId: number): Promise<bigint> {
    const client = this.getClient(chainId);
    return await client.getBalance({ address: address as `0x${string}` });
  }

  async getTokenBalance(
    tokenAddress: string,
    address: string,
    chainId: number,
    privateKey?: string
  ): Promise<bigint> {
    try {
      const client = this.getClient(chainId, privateKey);
      const balance = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      return balance as bigint;
    } catch (error) {
      await this.logger.log(
        `Failed to get token balance: ${error.message}`,
        "error"
      );
      return BigInt(0);
    }
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
    try {
      const client = this.getClient(chainId);
      const decimals = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      });
      return decimals as number;
    } catch (error) {
      await this.logger.log(
        `Failed to get token decimals: ${error.message}`,
        "error"
      );
      return 0;
    }
  }

  async executeSwap(
    params: EVMSwapParams & { privateKey?: string }
  ) {

    const swapResult = {
      txid: "",
      fromTokenBalanceChange: 0n,
      toTokenBalanceChange: 0n,
    };

    this.logger.log(`Executing EVM swap: ${JSON.stringify(params)}`);

    const client = this.getClient(params.chainId, params.privateKey);

    const receipt = await executeOkxSwap({
      ...params,
      client,
      logger: this.logger,
    });

    swapResult.txid = receipt.transactionHash;

    if (receipt.status === "success") {
      const tokensInfo = await this.getTokensInfo(
        client.account.address,
        params.chainId,
        [params.fromToken, params.toToken]
      );

      tokensInfo.forEach(async (tokenInfo) => {
        const tokenBalance = await this.tokenBalanceRepository.findOne({
          where: {
            address: tokenInfo.tokenAddress,
          },
        });
        if (tokenBalance) {
          if (tokenInfo.tokenAddress === params.fromToken) {
            swapResult.fromTokenBalanceChange = tokenInfo.balance - BigInt(tokenBalance.balance);
          } else {
            swapResult.toTokenBalanceChange = tokenInfo.balance - BigInt(tokenBalance.balance);
          }
          tokenBalance.balance = tokenInfo.balance.toString();
          tokenBalance.currentAllowance = tokenInfo.allowance.toString();
          this.logger.log(
            `Updated token balance: ${JSON.stringify(tokenBalance)}`
          );
          await this.tokenBalanceRepository.save(tokenBalance);
        }
      });

      return swapResult;
    }
  }

  async getTokensInfo(
    walletAddress: string,
    chainId: string,
    tokens: string[]
  ): Promise<EVMTokenInfo[]> {
    try {
      const client = this.getClient(chainId);
      const spenderAddress =
        OKX_SPENDER_ADDRESSES[
          chainId.toString() as keyof typeof OKX_SPENDER_ADDRESSES
        ];
      const multicallCalls = tokens.flatMap((token) => [
        {
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        },
        {
          address: token as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [walletAddress as `0x${string}`, spenderAddress],
        },
      ]);

      // Execute multicall
      // @ts-ignore
      const results = await client.multicall({
        contracts: multicallCalls,
      });

      const tokenInfos = [];

      for (let i = 0; i < results.length; i += 2) {
        const info = {
          tokenAddress: tokens[i / 2],
          balance: results[i].status === "success" ? results[i].result : 0n,
          allowance:
            results[i + 1].status === "success" ? results[i + 1].result : 0n,
        };
        tokenInfos.push(info);
      }

      return tokenInfos;
    } catch (error) {
      await this.logger.log(
        `Failed to get tokens info: ${error.message}`,
        "error"
      );
      return [];
    }
  }

  async setAllowance(
    chainId: string,
    tokenAddress: Address,
    allowance: bigint,
    privateKey?: string
  ): Promise<string | null> {
    try {
      const spenderAddress =
        EVM_SPENDER_ADDRESSES[chainId as keyof typeof EVM_SPENDER_ADDRESSES];
      if (!spenderAddress) {
        throw new Error(`Spender address not found for chain ${chainId}`);
      }

      const client = this.getClient(chainId, privateKey);
 
      this.logger.log(
        `Setting allowance for ${tokenAddress} to ${allowance} on chain ${chainId}`
      );

      const hash = await client.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, allowance],
        chain: client.chain,
        account: client.account,
      });
      await client.waitForTransactionReceipt({ hash });
      return hash; 
    } catch (error) {
      await this.logger.log(
        `Failed to set allowance: ${error.message}`,
        "error"
      );
      return null;
    }
  }
}
