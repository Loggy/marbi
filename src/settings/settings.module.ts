import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TokenBalance } from '../enities/token-balance.entity';
import { EVMModule } from '../blockchain/evm/evm.module';
import { SolanaModule } from '../blockchain/solana/solana.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenBalance]),
    EVMModule,
    SolanaModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {} 