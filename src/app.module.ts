import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoggerModule } from "./logger/logger.module";
import { EVMModule } from "./blockchain/evm/evm.module";
import { SolanaModule } from "./blockchain/solana/solana.module";
import { DexRouterModule } from "./dex-router/dex-router.module";
import { DDModule } from "./strategies/dd/dd.module";
import { SettingsModule } from "./settings/settings.module";
import { Order } from "./enities/order.entity";
import { TokenBalance } from "./enities/token-balance.entity";

import { config } from "dotenv";
config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Order, TokenBalance],
      synchronize: true, // Set to false in production
    }),
    LoggerModule,
    EVMModule,
    SolanaModule,
    DexRouterModule,
    DDModule,
    SettingsModule,
  ],
})
export class AppModule {}
