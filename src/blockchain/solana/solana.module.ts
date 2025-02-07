import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SolanaService } from "./solana.service";
import { SolanaController } from "./solana.controller";
import { TokenBalance } from "../../entities/token-balance.entity";

@Module({
  imports: [TypeOrmModule.forFeature([TokenBalance])],
  controllers: [SolanaController],
  providers: [SolanaService],
  exports: [SolanaService],
})
export class SolanaModule {}
