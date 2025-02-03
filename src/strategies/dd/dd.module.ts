import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DDController } from './dd.controller';
import { DDService } from './dd.service';
import { Order } from '../../enities/order.entity';
import { TokenBalance } from '../../enities/token-balance.entity';
import { EVMModule } from '../../blockchain/evm/evm.module';
import { SolanaModule } from '../../blockchain/solana/solana.module';
import { DexRouterModule } from '../../dex-router/dex-router.module';
import { SettingsModule } from '../../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, TokenBalance]),
    EVMModule,
    SolanaModule,
    DexRouterModule,
    SettingsModule,
  ],
  controllers: [DDController],
  providers: [DDService],
})
export class DDModule {} 