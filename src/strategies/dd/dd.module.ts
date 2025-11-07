import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { DDController } from "./dd.controller";
import { DDService } from "./dd.service";
import { Order } from "../../entities/order.entity";
import { TokenBalance } from "../../entities/token-balance.entity";
import { EVMModule } from "../../blockchain/evm/evm.module";
import { SolanaModule } from "../../blockchain/solana/solana.module";
import { DexRouterModule } from "../../dex-router/dex-router.module";
import { LoggerModule } from "../../logger/logger.module";
import { SettingsModule } from "../../settings/settings.module";
import { Initialize } from "src/entities/initialize.entity";
import { SharedModule } from '../../shared/shared.module';
import { StrategyModule } from "../../strategy/strategy.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, TokenBalance, Initialize]),
    BullModule.registerQueue({
      name: "strategy-dex-to-dex",
    }),
    EVMModule,
    SolanaModule,
    DexRouterModule,
    LoggerModule,
    SettingsModule,
    SharedModule,
    StrategyModule,
  ],
  controllers: [DDController],
  providers: [DDService],
})
export class DDModule {}
