import { Controller, Post, Body, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { DDService } from './dd.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('dd')
export class DDController {
  constructor(private readonly ddService: DDService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createOrder(@Body() params: CreateOrderDto) {
    return await this.ddService.createOrder(params);
  }

  @Get('balance')
  async getBalance(
    @Query('chainId') chainId: string,
    @Query('tokenAddress') tokenAddress: string,
  ) {
    return await this.ddService.updateTokenBalance(
      tokenAddress,
      chainId,
      0, // We'll get decimals from the token contract
      chainId === '101' ? 'solana' : 'evm'
    );
  }
} 