import { Module } from '@nestjs/common';
import { EVMService } from './evm.service';

@Module({
  providers: [EVMService],
  exports: [EVMService],
})
export class EVMModule {} 