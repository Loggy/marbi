import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { EVMListenerService } from "./evm-listener.service";
import { EVMListenerController } from "./evm-listener.controller";
import { LoggerModule } from "../../../logger/logger.module";
import { BlockEventsProcessor } from "./processors/block-events.processor";
import { PoolModule } from "../../../pool/pool.module";

/**
 * EVMListenerModule - Monitors new blocks on multiple EVM chains via WebSocket
 *
 * BlockEventsProcessor is enabled to process block and swap events from the queue.
 * You can also create custom processors by implementing @Processor('block-events')
 */
@Module({
  imports: [
    LoggerModule,
    PoolModule,
    BullModule.registerQueue({
      name: "block-events",
    }),
  ],
  providers: [
    EVMListenerService,
    BlockEventsProcessor,
  ],
  controllers: [EVMListenerController],
  exports: [EVMListenerService],
})
export class EVMListenerModule {}

