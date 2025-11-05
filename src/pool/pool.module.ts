import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PoolController } from "./pool.controller";
import { PoolService } from "./pool.service";
import { Pool } from "../entities/pool.entity";
import { Token } from "../entities/token.entity";
import { TokenAddress } from "../entities/token-address.entity";
import { Dex } from "../entities/dex.entity";

/**
 * Module for Pool management
 * Provides CRUD operations and specialized queries for Pool entities
 */
@Module({
  imports: [TypeOrmModule.forFeature([Pool, Token, TokenAddress, Dex])],
  controllers: [PoolController],
  providers: [PoolService],
  exports: [PoolService],
})
export class PoolModule {}
