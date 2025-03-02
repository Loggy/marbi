import { Module } from '@nestjs/common';
import { BybitPriceService } from './services/bybit-price.service';

@Module({
  providers: [BybitPriceService],
  exports: [BybitPriceService],
})
export class SharedModule {} 