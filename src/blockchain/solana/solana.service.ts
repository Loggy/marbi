import { Injectable } from "@nestjs/common";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout, MintLayout } from "@solana/spl-token";
import { LoggerService } from "../../logger/logger.service";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { TokenListProvider } from "@solana/spl-token-registry";

export type TokenBalance = {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
};

@Injectable()
export class SolanaService {
  private client: Connection;
  private jitoClient: Connection;
  private signer: Keypair;
  private wallet: Wallet;

  constructor(private readonly logger: LoggerService) {
    this.client = new Connection(process.env.SOLANA_RPC_URL);
    this.jitoClient = new Connection(process.env.JITO_RPC_URL);
    // Initialize signer with private key
    const privateKeyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    this.signer = Keypair.fromSecretKey(privateKeyBytes);
    this.wallet = new Wallet(this.signer);
    this.logger = logger;
  }

  async getNativeBalance(address: string): Promise<number> {
    const publicKey = new PublicKey(address);
    return await this.client.getBalance(publicKey);
  }

  async getTokenBalance(
    wallet: PublicKey,
    tokenAddress: string
  ): Promise<number> {
    const mint = new PublicKey(tokenAddress);

    const tokenAccounts = await this.client.getTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    });

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
    console.log(`SOL Balance: ${solBalance / LAMPORTS_PER_SOL}`);

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
        mint: mintAddress,
        amount: Number(amount),
        decimals,
        uiAmount: Number(amount) / Math.pow(10, decimals),
      });
    }

    return {
      solBalance: solBalance / LAMPORTS_PER_SOL,
      tokens: tokenBalances,
    };
  }

  async jupSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: string,
    jitoTipLamports: number = 0
  ) {
    const swapResult = {
      // amountBaught: 0n,
      txid: "",
      solscanLink: "",
    };

    this.logger.log(
      `Starting JUP swap
      fromToken: ${fromToken}
      toToken: ${toToken}
      amount: ${amount}
      slippage: ${slippage}\n`
    );

    // const balanceBefore = await this.getTokenBalance(this.wallet.publicKey, toToken);

    // console.log("Balance before: ", balanceBefore);

    // Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
    const quoteResponse = await (
      await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${amount}&slippageBps=${slippage}`
      )
    ).json();

    // get serialized transactions for the swap

    let prioritizationFeeLamports: any = {
      priorityLevelWithMaxLamports: {
        maxLamports: 10000000,
        priorityLevel: "veryHigh",
      },
    };

    if (jitoTipLamports > 0) {
      prioritizationFeeLamports = {
        jitoTipLamports,
      };
    }

    const { swapTransaction } = await (
      await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // quoteResponse from /quote api
          quoteResponse,
          // user public key to be used for the swap
          userPublicKey: this.wallet.publicKey.toString(),
          // auto wrap and unwrap SOL. default is true
          prioritizationFeeLamports,
          wrapAndUnwrapSol: true,
          // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
          // feeAccount: "fee_account_public_key"
        }),
      })
    ).json();

    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // sign the transaction
    transaction.sign([this.wallet.payer]);

    // get the latest block hash
    const latestBlockHash = await this.client.getLatestBlockhash();

    // Execute the transaction
    const rawTransaction = transaction.serialize();
    const txid = await this.client.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });

    this.logger.log(`Transaction sent: ${txid}`);

    this.logger.log("Waiting for transaction to confirm...");

    await this.client.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });
    this.logger.log(`Transaction confirmed: ${txid}`);

    // const balanceAfter = await this.getTokenBalance(
    //   this.wallet.publicKey,
    //   toToken
    // );

    // // Calculate tokens received
    // const tokensReceived = balanceAfter - balanceBefore;

    // swapResult.amountBaught = BigInt(tokensReceived);
    swapResult.txid = txid;
    swapResult.solscanLink = `https://solscan.io/tx/${txid}`;

    // console.log("Tokens received: ", tokensReceived);

    return swapResult;
  }
}
