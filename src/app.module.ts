import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { LoggerModule } from "./logger/logger.module";
import { PoolModule } from "./pool/pool.module";
import { DexModule } from "./dex/dex.module";
import { TokenModule } from "./token/token.module";
import { StrategyModule } from "./strategy/strategy.module";
import { Token } from "./entities/token.entity";
import { TokenAddress } from "./entities/token-address.entity";
import { Pool } from "./entities/pool.entity";
import { Dex } from "./entities/dex.entity";
import { Strategy } from "./entities/strategy.entity";

import { config } from "dotenv";
import { EVMListenerModule } from "./blockchain/evm/evm-listener/evm-listener.module";
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
      entities: [Token, TokenAddress, Pool, Dex, Strategy],
      synchronize: true, // Set to false in production
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    LoggerModule,
    EVMListenerModule,
    PoolModule,
    DexModule,
    TokenModule,
    StrategyModule,
  ],
})
export class AppModule {}
