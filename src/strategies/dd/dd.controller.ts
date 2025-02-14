import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { DDService } from "./dd.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { getChainIdByName } from "src/blockchain/evm/evm.service";
import { SolanaSwapParams } from "src/blockchain/solana/solana.service";
import { EVMSwapParams } from "src/blockchain/evm/providers/okx";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Address, privateKeyToAddress } from "viem/accounts";
import { Keypair, PublicKey } from "@solana/web3.js";

import { config } from "dotenv";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { LoggerService } from "src/logger/logger.service";

config();
@ApiTags("dd")
@Controller("dd")
export class DDController {
  constructor(private readonly ddService: DDService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Create a new DD order" })
  @ApiResponse({
    status: 201,
    description: "Order created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string" },
        params: { type: "object" },
        result: { type: "object" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async createOrder(@Body() params: CreateOrderDto) {
    const fromNetworkName = params.spread_entry.from_network_name;
    const toNetworkName = params.spread_entry.to_network_name;

    const fromNetwork =
      params.config.Network0.NetworkName === fromNetworkName
        ? params.config.Network0
        : params.config.Network1;

    const toNetwork =
      params.config.Network0.NetworkName === toNetworkName
        ? params.config.Network0
        : params.config.Network1;

    if (fromNetwork.NetworkName === "solana") {
      (fromNetwork.swapParams as SolanaSwapParams) = {
        fromToken: fromNetwork.StartTokenAddress,
        toToken: fromNetwork.FinishTokenAddress,
        amount: params.spread_entry.from_network_amount_in_tokens.toString(),
        slippage: fromNetwork.SlippagePercent,
      };
    } else {
      (fromNetwork.swapParams as EVMSwapParams) = {
        fromToken: fromNetwork.StartTokenAddress as `0x${string}`,
        toToken: fromNetwork.FinishTokenAddress as `0x${string}`,
        amount: params.spread_entry.from_network_amount_in_tokens.toString(),
        slippage: fromNetwork.SlippagePercent,
        chainId: getChainIdByName(fromNetwork.NetworkName),
      };
    }

    if (toNetwork.NetworkName === "solana") {
      (toNetwork.swapParams as SolanaSwapParams) = {
        fromToken: toNetwork.FinishTokenAddress,
        toToken: toNetwork.StartTokenAddress,
        amount: params.spread_entry.to_network_amount_in_tokens.toString(),
        slippage: toNetwork.SlippagePercent,
      };
    } else {
      (toNetwork.swapParams as EVMSwapParams) = {
        fromToken: toNetwork.FinishTokenAddress as `0x${string}`,
        toToken: toNetwork.StartTokenAddress as `0x${string}`,
        amount: params.spread_entry.to_network_amount_in_tokens.toString(),
        slippage: toNetwork.SlippagePercent,
        chainId: getChainIdByName(toNetwork.NetworkName),
      };
    }

    return await this.ddService.createOrder(params);
  }
  @Post("test")
async test(@Body() params: { message: string }) {
  const logger = new LoggerService();
  const message = `
  <b>bold</b>, <strong>bold</strong>
<i>italic</i>, <em>italic</em>
<u>underline</u>, <ins>underline</ins>
<s>strikethrough</s>, <strike>strikethrough</strike>, <del>strikethrough</del>
<span class="tg-spoiler">spoiler</span>, <tg-spoiler>spoiler</tg-spoiler>
<b>bold <i>italic bold <s>italic bold strikethrough <span class="tg-spoiler">italic bold strikethrough spoiler</span></s> <u>underline italic bold</u></i> bold</b>
<a href="http://www.example.com/">inline URL</a>
<a href="tg://user?id=123456789">inline mention of a user</a>
<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>
<code>inline fixed-width code</code>
<pre>pre-formatted fixed-width code block</pre>
<pre><code class="language-python">pre-formatted fixed-width code block written in the Python programming language</code></pre>
<blockquote>Block quotation started\nBlock quotation continued\nThe last line of the block quotation</blockquote>
<blockquote expandable>Expandable block quotation started\nExpandable block quotation continued\nExpandable block quotation continued\nHidden by default part of the block quotation started\nExpandable block quotation continued\nThe last line of the block quotation</blockquote>`
  await logger.telegramNotify(message, 'HTML');

  return { message: 'Message sent' };
}
}
