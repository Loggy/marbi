import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenController } from "./token.controller";
import { TokenService } from "./token.service";
import { Token } from "../entities/token.entity";
import { TokenAddress } from "../entities/token-address.entity";

/**
 * Module for Token and TokenAddress management
 * Provides CRUD operations for Token entities and their addresses
 */
@Module({
  imports: [TypeOrmModule.forFeature([Token, TokenAddress])],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
