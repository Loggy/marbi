import { Controller, Post, Body } from '@nestjs/common';
import { DDService } from './dd.service';

@Controller('dd')
export class DDController {
  constructor(private readonly ddService: DDService) {}

  @Post()
  async createOrder(@Body() params: any) {
    return await this.ddService.createOrder(params);
  }
} 