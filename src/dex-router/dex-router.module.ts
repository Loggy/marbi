import { Module } from '@nestjs/common';
import { DexRouterService } from './dex-router.service';

@Module({
  providers: [DexRouterService],
  exports: [DexRouterService],
})
export class DexRouterModule {} 