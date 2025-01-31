import { Controller, Post, Body } from "@nestjs/common";
import { EVMService } from "./evm.service";

@Controller("evm")
export class EVMController {
  constructor(private readonly evmService: EVMService) {}

  @Post("okx-swap")
  async okxSwap(
    @Body()
    params: {
      chainId: string;
      fromToken: string;
      toToken: string;
      amount: string;
      slippage?: string;
    },
  ) {
    return await this.evmService.okxSwap(params);
  }
}
