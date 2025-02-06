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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('dd')
@Controller("dd")
export class DDController {
  constructor(private readonly ddService: DDService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a new DD order' })
  @ApiResponse({ 
    status: 201, 
    description: 'Order created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
        params: { type: 'object' },
        result: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
        amount: String(
          params.config.Amounts_In[0].amount *
            10 ** Number(fromNetwork.StartTokenDecimals)
        ),
        slippage: fromNetwork.SlippagePercent,
      };
    } else {
      (fromNetwork.swapParams as EVMSwapParams) = {
        fromToken: fromNetwork.StartTokenAddress as `0x${string}`,
        toToken: fromNetwork.FinishTokenAddress as `0x${string}`,
        amount: String(
          params.config.Amounts_In[0].amount *
            10 ** Number(fromNetwork.StartTokenDecimals)
        ),
        slippage: fromNetwork.SlippagePercent,
        chainId: getChainIdByName(fromNetwork.NetworkName),
      };
    }

    if (toNetwork.NetworkName === "solana") {
      (toNetwork.swapParams as SolanaSwapParams) = {
        fromToken: toNetwork.FinishTokenAddress,
        toToken: toNetwork.StartTokenAddress,
        amount: String(
          params.config.Amounts_In[1].amount *
            10 ** Number(toNetwork.FinishTokenDecimals)
        ),
        slippage: toNetwork.SlippagePercent,
      };
    } else {
      (toNetwork.swapParams as EVMSwapParams) = {
        fromToken: toNetwork.FinishTokenAddress as `0x${string}`,
        toToken: toNetwork.StartTokenAddress as `0x${string}`,
        amount: String(
          params.config.Amounts_In[1].amount *
            10 ** Number(toNetwork.FinishTokenDecimals)
        ),
        slippage: toNetwork.SlippagePercent,
        chainId: getChainIdByName(toNetwork.NetworkName),
      };
    }

    return await this.ddService.createOrder(params);
  }
}
