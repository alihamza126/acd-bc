import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATIONS_QUEUE_NAME } from './queue.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsQueueService } from './notifications-queue.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        return {
          connection: url ? { url } : { host: 'localhost', port: 6379 },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE_NAME,
    }),
  ],
  providers: [NotificationsProcessor, NotificationsQueueService],
  exports: [BullModule, NotificationsQueueService],
})
export class QueueModule {}
