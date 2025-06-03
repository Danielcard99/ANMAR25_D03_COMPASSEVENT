import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [],
})
export class EventsModule {}
