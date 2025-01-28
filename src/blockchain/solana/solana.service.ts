import { Injectable } from '@nestjs/common';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { LoggerService } from '../../logger/logger.service';
import bs58 from 'bs58';

@Injectable()
export class SolanaService {
  private client: Connection;
  private signer: Keypair;

  constructor(private readonly logger: LoggerService) {
    this.client = new Connection(process.env.SOLANA_RPC_URL);
    // Initialize signer with private key
    const privateKeyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    this.signer = Keypair.fromSecretKey(privateKeyBytes);
  }

  async getNativeBalance(address: string): Promise<number> {
    const publicKey = new PublicKey(address);
    return await this.client.getBalance(publicKey);
  }

  async getTokenBalance(address: string, tokenAddress: string): Promise<number> {
    const wallet = new PublicKey(address);
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

  async signAndSendTransaction(txData: string): Promise<string> {
    try {
      // Deserialize transaction from base64 string
      const transaction = Transaction.from(Buffer.from(txData, 'base64'));
      
      // Sign the transaction
      transaction.sign(this.signer);
      
      // Send the transaction
      const signature = await this.client.sendRawTransaction(
        transaction.serialize()
      );
      
      await this.logger.log(`Solana transaction sent: ${signature}`);
      return signature;
    } catch (error) {
      await this.logger.log(`Failed to send Solana transaction: ${error.message}`, 'error');
      throw error;
    }
  }
} 