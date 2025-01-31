import { Controller, Post, Body } from "@nestjs/common";
import { SolanaService } from "./solana.service";

@Controller("solana")
export class SolanaController {
  constructor(private readonly solanaService: SolanaService) {}

  @Post("check-balances")
  async checkAllBalances(@Body() { walletAddress }: { walletAddress: string }) {
    return await this.solanaService.getWalletBalances(walletAddress);
  }

  @Post("jup-swap")
  async jupSwap(
    @Body()
    params: {
      fromToken: string;
      toToken: string;
      amount: string;
      slippage?: string;
      jitoTipLamports?: number;
    }
  ) {
    return await this.solanaService.executeSwap(params);
  }
}
