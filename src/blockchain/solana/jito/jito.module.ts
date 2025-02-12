import { Module } from '@nestjs/common';
import { JitoService } from './jito.service';
import { LoggerModule } from '../../../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [JitoService],
  exports: [JitoService],
})
export class JitoModule {} 