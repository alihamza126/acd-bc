import { Module } from '@nestjs/common';
import { ListingSubscriptionsService } from './listing-subscriptions.service';
import { ListingSubscriptionsController } from './listing-subscriptions.controller';
import { ListingSubscriptionsDigestService } from './listing-subscriptions-digest.service';
import { ListingSubscriptionsCron } from './listing-subscriptions.cron';
import { DatabaseModule } from '../common/database/database.module';
import { QueueModule } from '../common/queues/queue.module';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [
    ListingSubscriptionsService,
    ListingSubscriptionsDigestService,
    ListingSubscriptionsCron,
  ],
  controllers: [ListingSubscriptionsController],
})
export class ListingSubscriptionsModule {}

