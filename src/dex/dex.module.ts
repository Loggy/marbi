import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DexController } from "./dex.controller";
import { DexService } from "./dex.service";
import { Dex } from "../entities/dex.entity";

/**
 * Module for DEX management
 * Provides CRUD operations for DEX entities
 */
@Module({
  imports: [TypeOrmModule.forFeature([Dex])],
  controllers: [DexController],
  providers: [DexService],
  exports: [DexService],
})
export class DexModule {}
