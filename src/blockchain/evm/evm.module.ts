import { Module } from "@nestjs/common";
import { EVMService } from "./evm.service";
import { EVMController } from "./evm.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenBalance } from "src/entities/token-balance.entity";

@Module({
  imports: [TypeOrmModule.forFeature([TokenBalance])],
  providers: [EVMService],
  exports: [EVMService],
  controllers: [EVMController],
})
export class EVMModule {}
