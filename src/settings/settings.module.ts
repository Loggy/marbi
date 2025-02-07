import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { TokenBalance } from "../entities/token-balance.entity";
import { Initialize } from "../entities/initialize.entity";
import { EVMModule } from "../blockchain/evm/evm.module";
import { SolanaModule } from "../blockchain/solana/solana.module";
import { LoggerModule } from "src/logger/logger.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenBalance, Initialize]),
    EVMModule,
    SolanaModule,
    LoggerModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
