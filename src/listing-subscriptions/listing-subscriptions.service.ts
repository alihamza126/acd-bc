import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { CreateListingSubscriptionDto } from './dto/create-listing-subscription.dto';
import { UpdateListingSubscriptionDto } from './dto/update-listing-subscription.dto';

@Injectable()
export class ListingSubscriptionsService {
  private readonly logger = new Logger(ListingSubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateListingSubscriptionDto) {
    try {
      const data: Prisma.ListingSubscriptionCreateInput = {
        user: { connect: { id: userId } },
        name: dto.name ?? null,
        frequency: dto.frequency ?? 'DAILY',
        channel: dto.channel ?? 'EMAIL',
        status: 'ACTIVE',
        minPrice: dto.minPrice != null ? new Prisma.Decimal(dto.minPrice) : null,
        maxPrice: dto.maxPrice != null ? new Prisma.Decimal(dto.maxPrice) : null,
        monetization: dto.monetization ?? null,
        platform: dto.platform as string,
        category: dto.category ?? null,
        audienceCountry: dto.audienceCountry ?? null,
      };

      const sub = await (this.prisma as any).listingSubscription.create({ data });
      return sub;
    } catch (error) {
      this.logger.error('Create listing subscription failed', error);
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async findMy(userId: number) {
    try {
      return (this.prisma as any).listingSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Find subscriptions failed', error);
      throw new InternalServerErrorException('Failed to fetch subscriptions');
    }
  }

  async update(userId: number, id: number, dto: UpdateListingSubscriptionDto) {
    try {
      const existing = await (this.prisma as any).listingSubscription.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException('Subscription not found');
      }
      if (existing.userId !== userId) {
        throw new ForbiddenException('You can only update your own subscriptions');
      }

      const data: Prisma.ListingSubscriptionUpdateInput = {};
      const payload = dto as any;
      if (payload.name !== undefined) data.name = payload.name;
      if (payload.frequency !== undefined) data.frequency = payload.frequency;
      if (payload.channel !== undefined) data.channel = payload.channel;
      if (payload.status !== undefined) data.status = payload.status;
      if (payload.minPrice !== undefined) {
        data.minPrice =
          payload.minPrice != null ? new Prisma.Decimal(payload.minPrice) : null;
      }
      if (payload.maxPrice !== undefined) {
        data.maxPrice =
          payload.maxPrice != null ? new Prisma.Decimal(payload.maxPrice) : null;
      }
      if (payload.monetization !== undefined) data.monetization = payload.monetization;
      if (payload.platform !== undefined) data.platform = payload.platform;
      if (payload.category !== undefined) data.category = payload.category;
      if (payload.audienceCountry !== undefined) {
        data.audienceCountry = payload.audienceCountry;
      }

      const updated = await (this.prisma as any).listingSubscription.update({
        where: { id },
        data,
      });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Update subscription ${id} failed`, error);
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  async pause(userId: number, id: number) {
    return this.setStatus(userId, id, 'PAUSED');
  }

  async resume(userId: number, id: number) {
    return this.setStatus(userId, id, 'ACTIVE');
  }

  async cancel(userId: number, id: number) {
    return this.setStatus(userId, id, 'CANCELLED');
  }

  private async setStatus(
    userId: number,
    id: number,
    status: 'ACTIVE' | 'PAUSED' | 'CANCELLED',
  ) {
    try {
      const existing = await (this.prisma as any).listingSubscription.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException('Subscription not found');
      }
      if (existing.userId !== userId) {
        throw new ForbiddenException('You can only update your own subscriptions');
      }
      const data: Prisma.ListingSubscriptionUpdateInput = {
        status,
      };
      if (status === 'CANCELLED') {
        data.cancelledAt = new Date();
      }
      return (this.prisma as any).listingSubscription.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Set status for subscription ${id} failed`, error);
      throw new InternalServerErrorException('Failed to update subscription status');
    }
  }
}

