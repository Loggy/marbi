import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SolanaService } from "./solana.service";
import { SolanaController } from "./solana.controller";
import { TokenBalance } from "../../entities/token-balance.entity";
import { JitoService } from "./jito/jito.service";

@Module({
  imports: [TypeOrmModule.forFeature([TokenBalance])],
  controllers: [SolanaController],
  providers: [SolanaService, JitoService],
  exports: [SolanaService],
})
export class SolanaModule {}
