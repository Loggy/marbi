import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StrategyController } from "./strategy.controller";
import { StrategyService } from "./strategy.service";
import { Strategy } from "../entities/strategy.entity";
import { Pool } from "../entities/pool.entity";

/**
 * Module for Strategy management
 * Provides CRUD operations and pool management for Strategy entities
 */
@Module({
  imports: [TypeOrmModule.forFeature([Strategy, Pool])],
  controllers: [StrategyController],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
