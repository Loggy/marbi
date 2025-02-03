import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
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
}
