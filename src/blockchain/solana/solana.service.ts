import { Injectable } from "@nestjs/common";
import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  TransactionError,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout, MintLayout } from "@solana/spl-token";
import { LoggerService } from "../../logger/logger.service";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { TokenBalance as TokenBalanceEntity } from "src/entities/token-balance.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JitoService } from "./jito/jito.service";

export type TokenBalance = {
  address: string;
  balance: string;
  decimals: number;
  uiAmount: number;
  chainId: string;
};

export type SolanaSwapParams = {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: string;
  privateKey?: string;
  jitoTipLamports?: number;
};

export interface TokenBalanceChange {
  mint: string;
  preBalance: bigint;
  postBalance: bigint;
  difference: bigint;
}

@Injectable()
export class SolanaService {
  private client: Connection;
  private jitoClient: Connection;
  @InjectRepository(TokenBalanceEntity)
  private tokenBalanceRepository: Repository<TokenBalance>;
  constructor(private readonly logger: LoggerService, private readonly jitoService: JitoService) {
    this.client = new Connection(process.env.SOLANA_RPC_URL);
    this.jitoClient = new Connection(process.env.JITO_RPC_URL);
  }

  private getWallet(privateKey?: string): Wallet {
    if (privateKey) {
      const privateKeyBytes = bs58.decode(privateKey);
      return new Wallet(Keypair.fromSecretKey(privateKeyBytes));
    }
    // Fall back to default wallet
    const defaultPrivateKeyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    return new Wallet(Keypair.fromSecretKey(defaultPrivateKeyBytes));
  }

  async getNativeBalance(address: string): Promise<number> {
    const publicKey = new PublicKey(address);
    return await this.client.getBalance(publicKey);
  }

  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    privateKey?: string
  ): Promise<number> {
    const wallet = this.getWallet(privateKey);
    const mint = new PublicKey(tokenAddress);

    const tokenAccounts = await this.client.getTokenAccountsByOwner(
      new PublicKey(walletAddress),
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    for (const { account } of tokenAccounts.value) {
      const accountInfo = AccountLayout.decode(account.data);
      if (accountInfo.mint.equals(mint)) {
        return Number(accountInfo.amount);
      }
    }

    return 0;
  }

  async getWalletBalances(
    walletAddress: string
  ): Promise<{ solBalance: number; tokens: TokenBalance[] }> {
    // Connect to Solana Mainnet
    const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
    const publicKey = new PublicKey(walletAddress);

    // 1. Get SOL Balance
    const solBalance = await connection.getBalance(publicKey);

    // 2. Get SPL Token Accounts
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Aggregate token balances by mint address
    const mintAmounts = new Map<string, bigint>();
    for (const { account } of tokenAccounts.value) {
      const accountInfo = AccountLayout.decode(account.data);
      if (accountInfo.amount === BigInt(0)) continue; // Skip empty accounts

      const mintAddress = accountInfo.mint.toString();
      const currentAmount = mintAmounts.get(mintAddress) || BigInt(0);
      mintAmounts.set(mintAddress, currentAmount + accountInfo.amount);
    }

    // 3. Get Decimals for All Mints
    const mints = Array.from(mintAmounts.keys()).map((m) => new PublicKey(m));
    const mintAccounts = await connection.getMultipleAccountsInfo(mints);
    const mintDecimals = new Map<string, number>();

    mintAccounts.forEach((account, index) => {
      if (!account) return;
      const mintAddress = mints[index].toString();
      const mintInfo = MintLayout.decode(account.data);
      mintDecimals.set(mintAddress, mintInfo.decimals);
    });

    // 5. Format Results
    const tokenBalances: TokenBalance[] = [];
    for (const [mintAddress, amount] of mintAmounts.entries()) {
      const decimals = mintDecimals.get(mintAddress) || 0;

      tokenBalances.push({
        address: mintAddress,
        balance: amount.toString(),
        decimals,
        uiAmount: Number(amount) / Math.pow(10, decimals),
        chainId: "101",
      });
    }

    return {
      solBalance: solBalance / LAMPORTS_PER_SOL,
      tokens: tokenBalances,
    };
  }

  private async signAndSendTransaction(transaction: VersionedTransaction, privateKey?: string) {
    // Sign the transaction
    transaction.sign([this.getWallet(privateKey).payer]);

    // Get the latest block hash
    const latestBlockHash = await this.client.getLatestBlockhash();

    // Execute the transaction
    const rawTransaction = transaction.serialize();
    const txid = await this.client.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });

    this.logger.log(`Transaction sent: ${txid}`);
    this.logger.log("Waiting for transaction to confirm...");

    const confirmation = await this.client.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });
    this.logger.log(`Transaction confirmed: ${txid}`);

    return { txid, confirmation };
  }

  private async signAndSendTransactionJito(transaction: VersionedTransaction, privateKey?: string) {
    // Sign the transaction
    transaction.sign([this.getWallet(privateKey).payer]);

    // Get the latest block hash from Jito client
    const latestBlockHash = await this.client.getLatestBlockhash();

    // Execute the transaction using Jito client
    const rawTransaction = transaction.serialize();
    const txid = await this.jitoClient.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });

    this.logger.log(`Transaction sent to Jito: ${txid}`);
    this.logger.log("Waiting for transaction to confirm...");

    const confirmation = await this.client.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });
    this.logger.log(`Transaction confirmed on Jito: ${txid}`);

    return { txid, confirmation };
  }

  async executeSwap(params: SolanaSwapParams) {
    const wallet = this.getWallet(params.privateKey);
    const swapResult: {
      txid: string;
      fromTokenBalanceChange: bigint;
      toTokenBalanceChange: bigint;
      endTimestamp: number;
      error: TransactionError;
    } = {
      txid: "",
      fromTokenBalanceChange: 0n,
      toTokenBalanceChange: 0n,
      endTimestamp: 0,
      error: null,
    };

    let slippageBps = Number(params.slippage || '0.5') * 100;

    const withJito = true;

    if (withJito) {
      slippageBps = 10 * 100;
      const tipFloorData = await this.jitoService.fetchLatestTipFloorData();
      if (tipFloorData) {
        params.jitoTipLamports = Math.floor(tipFloorData * LAMPORTS_PER_SOL);
      }
    }

    this.logger.log(
      `Starting JUP swap
      fromToken: ${params.fromToken}
      toToken: ${params.toToken}
      amount: ${params.amount}
      slippage: ${slippageBps}
      withJito: ${withJito}
      jitoTipLamports: ${params.jitoTipLamports}\n`
    );

    //todo get balance from DB

    // Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
    const quoteResponse = await (
      await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${params.fromToken}&outputMint=${params.toToken}&amount=${params.amount}&slippageBps=${slippageBps}`
      )
    ).json();

    // get serialized transactions for the swap

    let prioritizationFeeLamports: any = {
      priorityLevelWithMaxLamports: {
        maxLamports: 10000000,
        priorityLevel: "medium", // medium If you want to land transaction fast, set this to use `veryHigh`. You will pay on average higher priority fee.
      },
    };

    if (withJito) {
      prioritizationFeeLamports = {
        jitoTipLamports: params.jitoTipLamports,
      };
    }

    const swapTransactionJson = await (
      await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // quoteResponse from /quote api
          quoteResponse,
          // user public key to be used for the swap
          userPublicKey: wallet.publicKey.toString(),
          // auto wrap and unwrap SOL. default is true
          prioritizationFeeLamports,
          wrapAndUnwrapSol: true,
          // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
          // feeAccount: "fee_account_public_key"
        }),
      })
    ).json();

    if (swapTransactionJson.error) {
      throw new Error("JupSwap error: " + swapTransactionJson.error);
    }

    const swapTransaction = swapTransactionJson.swapTransaction;

    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Use Jito client if tip is provided, otherwise use regular client
    const { txid, confirmation } = withJito
      ? await this.signAndSendTransactionJito(transaction, params.privateKey)
      : await this.signAndSendTransaction(transaction, params.privateKey);

    // Fetch transaction details to get block time
    const txDetails = await this.client.getParsedTransaction(txid, {
      maxSupportedTransactionVersion: 0,
    });

    const { isError, isSlippage } = await this.checkError(txDetails);

    if (isError) {
      throw new Error("Solana transaction failed" + (isSlippage ? ", Slippage error" : ""));
    }

    swapResult.endTimestamp = (txDetails.blockTime || 0) * 1000;
    swapResult.txid = txid;
    swapResult.error = confirmation.value.err;

    const fromTokenNewBalance = await this.getTokenBalance(
      params.fromToken,
      wallet.publicKey.toString(),
      params.privateKey
    );

    const toTokenNewBalance = await this.getTokenBalance(
      params.toToken,
      wallet.publicKey.toString(),
      params.privateKey
    );

    const fromTokenBalance = await this.tokenBalanceRepository.findOne({
      where: {
        address: params.fromToken,
      },
    });

    const toTokenBalance = await this.tokenBalanceRepository.findOne({
      where: {
        address: params.toToken,
      },
    });

    if (fromTokenBalance) {
      const fromTokenBalanceChange = BigInt(fromTokenNewBalance) - BigInt(fromTokenBalance.balance);
      swapResult.fromTokenBalanceChange = fromTokenBalanceChange;

      fromTokenBalance.balance = fromTokenNewBalance.toString();
      await this.tokenBalanceRepository.save(fromTokenBalance);
    }

    if (toTokenBalance) {
      const toTokenBalanceChange = BigInt(toTokenNewBalance) - BigInt(toTokenBalance.balance);
      swapResult.toTokenBalanceChange = toTokenBalanceChange;

      toTokenBalance.balance = toTokenNewBalance.toString();
      await this.tokenBalanceRepository.save(toTokenBalance);
    }

    this.logger.log(
      `Updated token balances: 
      balance fromToken: ${fromTokenBalance?.balance}
      balance change fromToken: ${swapResult.fromTokenBalanceChange}
      balance toToken: ${toTokenBalance?.balance}
      balance change toToken: ${swapResult.toTokenBalanceChange}
      error: ${swapResult.error}`
    );

    return swapResult;
  }

  async getTokenInfo(tokenAddress: string): Promise<{ decimals: number }> {
    const mint = new PublicKey(tokenAddress);
    const mintAccount = await this.client.getAccountInfo(mint);

    if (!mintAccount) {
      throw new Error("Token mint not found");
    }

    const mintInfo = MintLayout.decode(mintAccount.data);
    return {
      decimals: mintInfo.decimals,
    };
  }

  async checkError(txDetails: ParsedTransactionWithMeta) {

    const isError = !!txDetails.meta?.err;

    if (isError) {
      const slippageErrorMessage = txDetails.meta.logMessages.find((message) => message.includes("custom program error: 0x1771"));

      if (slippageErrorMessage) {
        return {
          isError: true,
          isSlippage: true,
        };
      }
      return {
        isError: true,
        isSlippage: false,
      };
    }

    return {
      isError: false,
    }
  }
}
