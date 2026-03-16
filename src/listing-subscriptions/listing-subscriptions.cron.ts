import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ListingSubscriptionsDigestService } from './listing-subscriptions-digest.service';

@Injectable()
export class ListingSubscriptionsCron {
  private readonly logger = new Logger(ListingSubscriptionsCron.name);

  constructor(
    private readonly digestService: ListingSubscriptionsDigestService,
  ) {}

  /**
   * Run once per day to generate and send listing digests.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyDigest(): Promise<void> {
    this.logger.log('Triggering daily listing digest cron');
    await this.digestService.processDailyDigests();
  }
}

