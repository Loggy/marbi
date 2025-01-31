import { Module } from "@nestjs/common";
import { EVMService } from "./evm.service";
import { EVMController } from "./evm.controller";

@Module({
  providers: [EVMService],
  exports: [EVMService],
  controllers: [EVMController],
})
export class EVMModule {}
