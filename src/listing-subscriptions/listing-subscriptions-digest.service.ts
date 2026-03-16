import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { NotificationsQueueService } from '../common/queues/notifications-queue.service';

@Injectable()
export class ListingSubscriptionsDigestService {
  private readonly logger = new Logger(ListingSubscriptionsDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsQueue: NotificationsQueueService,
  ) {}

  /**
   * Process daily digests: find active DAILY subscriptions that need a run,
   * find matching listings, log deliveries and enqueue one email per user.
   */
  async processDailyDigests(): Promise<void> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.logger.log('Starting daily listing digest processing');

    // Find subscriptions to process
    const subscriptions =
      await this.prisma.listingSubscription.findMany({
        where: {
          status: 'ACTIVE',
          frequency: 'DAILY',
          OR: [
            { lastRunAt: null },
            { lastRunAt: { lt: dayAgo } },
          ],
        },
      });

    if (!subscriptions.length) {
      this.logger.log('No subscriptions to process for daily digests');
      return;
    }

    // Group matches per user
    const userMatches = new Map<
      number,
      {
        subscriptionName: string;
        listings: Array<{ id: number; title: string; price: number }>;
      }[]
    >();

    for (const sub of subscriptions) {
      const fromTime = sub.lastRunAt ?? dayAgo;

      const listingWhere: Prisma.ListingWhereInput = {
        deletedAt: null,
        status: 'active',
        createdAt: { gt: fromTime },
      };
      if (sub.platform) listingWhere.platform = sub.platform;
      if (sub.category) listingWhere.category = sub.category;
      if (sub.audienceCountry)
        listingWhere.audienceCountry = sub.audienceCountry;
      if (sub.minPrice != null || sub.maxPrice != null) {
        listingWhere.price = {};
        if (sub.minPrice != null) {
          (listingWhere.price as Prisma.DecimalFilter).gte = sub.minPrice;
        }
        if (sub.maxPrice != null) {
          (listingWhere.price as Prisma.DecimalFilter).lte = sub.maxPrice;
        }
      }

      const listings = await this.prisma.listing.findMany({
        where: listingWhere,
        select: { id: true, title: true, price: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!listings.length) {
        // Still update lastRunAt so we don't re-scan same window
        await this.prisma.listingSubscription.update({
          where: { id: sub.id },
          data: { lastRunAt: now },
        });
        continue;
      }

      // Filter out already delivered listings for this subscription
      const delivered =
        await this.prisma.listingSubscriptionDeliveryLog.findMany({
          where: {
            subscriptionId: sub.id,
            listingId: { in: listings.map((l) => l.id) },
          },
          select: { listingId: true },
        });
      const deliveredIds = new Set(delivered.map((d) => d.listingId));
      const newListings = listings.filter(
        (l) => !deliveredIds.has(l.id),
      );

      if (!newListings.length) {
        await this.prisma.listingSubscription.update({
          where: { id: sub.id },
          data: { lastRunAt: now },
        });
        continue;
      }

      // Log deliveries
      await this.prisma.listingSubscriptionDeliveryLog.createMany({
        data: newListings.map((l) => ({
          subscriptionId: sub.id,
          userId: sub.userId,
          listingId: l.id,
          sentAt: now,
        })),
      });

      // Aggregate per user
      const userList = userMatches.get(sub.userId) ?? [];
      userList.push({
        subscriptionName: sub.name ?? 'Saved search',
        listings: newListings.map((l) => ({
          id: l.id,
          title: l.title,
          price: Number(l.price),
        })),
      });
      userMatches.set(sub.userId, userList);

      // Update subscription cursor
      await this.prisma.listingSubscription.update({
        where: { id: sub.id },
        data: { lastRunAt: now, lastEmailSentAt: now },
      });
    }

    if (!userMatches.size) {
      this.logger.log('No new listings to send in digests');
      return;
    }

    // Load user emails
    const userIds = Array.from(userMatches.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

    // Enqueue one email per user
    for (const [userId, subs] of userMatches.entries()) {
      const email = emailByUserId.get(userId);
      if (!email) continue;

      const subject = 'Your daily listing digest';
      const bodyLines: string[] = [
        'Here are new listings that match your saved searches:',
        '',
      ];

      for (const sub of subs) {
        bodyLines.push(`=== ${sub.subscriptionName} ===`);
        for (const l of sub.listings) {
          bodyLines.push(
            `- [#${l.id}] ${l.title} — $${l.price.toFixed(2)}`,
          );
        }
        bodyLines.push('');
      }

      bodyLines.push('You can manage your subscriptions in your account.');

      await this.notificationsQueue.addEmailJob({
        email,
        subject,
        body: bodyLines.join('\n'),
        userId: String(userId),
      });
    }

    this.logger.log(
      `Daily listing digest processing completed for ${userMatches.size} users`,
    );
  }
}

