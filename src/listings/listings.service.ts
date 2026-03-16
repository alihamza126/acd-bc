import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { Prisma } from '@prisma/client';

function isPrismaUniqueConstraintError(error: unknown, field?: string): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  ) {
    if (!field) return true;
    const meta = error as {
      meta?: { target?: string[]; driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } } };
    };
    const target = meta.meta?.target;
    const adapterFields = meta.meta?.driverAdapterError?.cause?.constraint?.fields;
    const fields = Array.isArray(target) ? target : Array.isArray(adapterFields) ? adapterFields : [];
    return fields.includes(field);
  }
  return false;
}

const sellerIncludeForListings = {
  id: true,
  username: true,
  status: true,
  emailVerified: true,
  avatarUrl: true,
  createdAt: true,
  presence: true,
  rating: true,
  userBadges: { where: { active: true }, orderBy: { createdAt: 'desc' as const }, take: 10 },
  kyc: { orderBy: { updatedAt: 'desc' as const }, take: 1 },
} as const;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(sellerId: number, dto: CreateListingDto) {
    try {
      const status = dto.status ?? 'draft';
      const data: Prisma.ListingUncheckedCreateInput = {
        sellerId,
        title: dto.title,
        description: dto.description ?? null,
        platform: dto.platform,
        category: dto.category ?? null,
        link: dto.link ?? null,
        price: dto.price,
        status,
        subscribers: dto.subscribers != null ? BigInt(dto.subscribers) : null,
        monthlyViews: dto.monthlyViews != null ? BigInt(dto.monthlyViews) : null,
        monthlyIncome: dto.monthlyIncome ?? null,
        monthlyExpense: dto.monthlyExpense ?? null,
        monetizationAvailable: dto.monetizationAvailable ?? false,
        displayLink: dto.displayLink ?? false,
        allowComments: dto.allowComments ?? true,
        audienceCountry: dto.audienceCountry ?? null,
      };

      const listing = await this.prisma.listing.create({
        data,
        include: { seller: { select: sellerIncludeForListings } },
      });

      this.logger.log(`Listing created: ${listing.id} by user ${sellerId}`);
      return this.toListingResponse(listing);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      if (isPrismaUniqueConstraintError(error, 'link')) {
        throw new ConflictException('A listing with this link already exists');
      }
      this.logger.error('Create listing failed', error);
      throw new InternalServerErrorException('Failed to create listing');
    }
  }

  async findAll(query: QueryListingsDto) {
    try {
      const { platform, category, status, page = 1, limit = 20 } = query;
      const where: Prisma.ListingWhereInput = { deletedAt: null };
      if (platform) where.platform = platform;
      if (category) where.category = category;
      if (status) where.status = status;
      else where.status = 'active';

      const [listings, total] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          include: { seller: { select: sellerIncludeForListings } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.listing.count({ where }),
      ]);

      return {
        data: listings.map((l) => this.toListingResponse(l)),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Find listings failed', error);
      throw new InternalServerErrorException('Failed to fetch listings');
    }
  }

  async findOne(id: number, userId?: number) {
    try {
      const listing = await this.prisma.listing.findFirst({
        where: { id, deletedAt: null },
        include: { seller: { select: sellerIncludeForListings }, media: true },
      });

      if (!listing) {
        throw new NotFoundException(`Listing with ID ${id} not found`);
      }

      const isOwner = userId != null && listing.sellerId === userId;
      if (listing.status !== 'active' && !isOwner) {
        throw new NotFoundException(`Listing with ID ${id} not found`);
      }

      if (!isOwner && listing.status === 'active') {
        await this.prisma.listing.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        });
        listing.viewCount += 1;
      }

      return this.toListingResponse(listing);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Find listing ${id} failed`, error);
      throw new InternalServerErrorException('Failed to fetch listing');
    }
  }

  async update(id: number, userId: number, dto: UpdateListingDto) {
    try {
      const listing = await this.prisma.listing.findFirst({
        where: { id, deletedAt: null },
      });

      if (!listing) {
        throw new NotFoundException(`Listing with ID ${id} not found`);
      }

      if (listing.sellerId !== userId) {
        throw new ForbiddenException('You can only update your own listings');
      }

      const updateData: Prisma.ListingUpdateInput = {};
      if (dto.title != null) updateData.title = dto.title;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.platform != null) updateData.platform = dto.platform;
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.link !== undefined) updateData.link = dto.link;
      if (dto.price != null) updateData.price = dto.price;
      if (dto.status != null) updateData.status = dto.status;
      if (dto.subscribers != null) updateData.subscribers = BigInt(dto.subscribers);
      if (dto.monthlyViews != null) updateData.monthlyViews = BigInt(dto.monthlyViews);
      if (dto.monthlyIncome !== undefined) updateData.monthlyIncome = dto.monthlyIncome;
      if (dto.monthlyExpense !== undefined) updateData.monthlyExpense = dto.monthlyExpense;
      if (dto.monetizationAvailable !== undefined)
        updateData.monetizationAvailable = dto.monetizationAvailable;
      if (dto.displayLink !== undefined) updateData.displayLink = dto.displayLink;
      if (dto.allowComments !== undefined) updateData.allowComments = dto.allowComments;
      if (dto.audienceCountry !== undefined) updateData.audienceCountry = dto.audienceCountry;
      if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
      if (dto.featuredExpiresAt !== undefined)
        updateData.featuredExpiresAt = new Date(dto.featuredExpiresAt);

      const updated = await this.prisma.listing.update({
        where: { id },
        data: updateData,
        include: { seller: { select: sellerIncludeForListings } },
      });

      this.logger.log(`Listing updated: ${id} by user ${userId}`);
      return this.toListingResponse(updated);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (isPrismaUniqueConstraintError(error, 'link')) {
        throw new ConflictException('A listing with this link already exists');
      }
      this.logger.error(`Update listing ${id} failed`, error);
      throw new InternalServerErrorException('Failed to update listing');
    }
  }

  async remove(id: number, userId: number) {
    try {
      const listing = await this.prisma.listing.findFirst({
        where: { id, deletedAt: null },
      });

      if (!listing) {
        throw new NotFoundException(`Listing with ID ${id} not found`);
      }

      if (listing.sellerId !== userId) {
        throw new ForbiddenException('You can only delete your own listings');
      }

      await this.prisma.listing.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Listing soft-deleted: ${id} by user ${userId}`);
      return { message: 'Listing deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Delete listing ${id} failed`, error);
      throw new InternalServerErrorException('Failed to delete listing');
    }
  }

  async findMyListings(userId: number, query: QueryListingsDto) {
    try {
      const { status, page = 1, limit = 20 } = query;
      const where: Prisma.ListingWhereInput = { sellerId: userId, deletedAt: null };
      if (status) where.status = status;

      const [listings, total] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          include: { seller: { select: sellerIncludeForListings } },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.listing.count({ where }),
      ]);

      return {
        data: listings.map((l) => this.toListingResponse(l)),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Find my listings failed', error);
      throw new InternalServerErrorException('Failed to fetch your listings');
    }
  }

  private mapSellerForResponse(seller: {
    id: number;
    username: string;
    status: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    createdAt: Date;
    presence?: { status: string; lastSeen: Date } | null;
    rating?: { positive: number; neutral: number; negative: number } | null;
    userBadges?: Array<{ badge: string; expiry: Date | null; activeAt: Date | null }>;
    kyc?: Array<{ status: string }>;
  } | null) {
    if (!seller) return undefined;
    const now = new Date();
    const activeBadge = seller.userBadges?.find(
      (b) => !b.expiry || b.expiry > now,
    );
    return {
      id: seller.id,
      username: seller.username,
      status: seller.status,
      emailVerified: seller.emailVerified,
      avatarUrl: seller.avatarUrl,
      createdAt: seller.createdAt.toISOString(),
      presence: seller.presence
        ? { status: seller.presence.status, lastSeen: seller.presence.lastSeen.toISOString() }
        : null,
      rating: seller.rating
        ? { positive: seller.rating.positive, neutral: seller.rating.neutral, negative: seller.rating.negative }
        : null,
      activeBadge: activeBadge
        ? { badge: activeBadge.badge, expiry: activeBadge.expiry?.toISOString() ?? null, activeAt: activeBadge.activeAt?.toISOString() ?? null }
        : null,
      kycStatus: seller.kyc?.[0]?.status ?? null,
    };
  }

  private toListingResponse(
    listing: {
      id: number;
      sellerId: number;
      title: string;
      description: string | null;
      platform: string;
      category: string | null;
      link: string | null;
      price: unknown;
      status: string;
      subscribers: bigint | null;
      monthlyViews: bigint | null;
      monthlyIncome: unknown;
      monthlyExpense: unknown;
      monetizationAvailable: boolean;
      displayLink: boolean;
      allowComments: boolean;
      isFeatured: boolean;
      featuredExpiresAt: Date | null;
      viewCount: number;
      favoriteCount: number;
      createdAt: Date;
      updatedAt: Date;
      seller?: unknown;
      media?: Array<{ id: number; fileUrl: string; fileType: string | null; sortOrder: number }>;
    } & { audienceCountry?: string | null },
  ) {
    const seller = listing.seller as {
      id: number;
      username: string;
      status: string;
      emailVerified: boolean;
      avatarUrl: string | null;
      createdAt: Date;
      presence?: { status: string; lastSeen: Date } | null;
      rating?: { positive: number; neutral: number; negative: number } | null;
      userBadges?: Array<{ badge: string; expiry: Date | null; activeAt: Date | null }>;
      kyc?: Array<{ status: string }>;
    } | undefined;
    return {
      id: listing.id,
      sellerId: listing.sellerId,
      seller: this.mapSellerForResponse(seller ?? null),
      title: listing.title,
      description: listing.description,
      platform: listing.platform,
      category: listing.category,
      link: listing.link,
      price: Number(listing.price),
      status: listing.status,
      subscribers: listing.subscribers != null ? Number(listing.subscribers) : null,
      monthlyViews: listing.monthlyViews != null ? Number(listing.monthlyViews) : null,
      monthlyIncome: listing.monthlyIncome != null ? Number(listing.monthlyIncome) : null,
      monthlyExpense: listing.monthlyExpense != null ? Number(listing.monthlyExpense) : null,
      monetizationAvailable: listing.monetizationAvailable,
      displayLink: listing.displayLink,
      allowComments: listing.allowComments,
      isFeatured: listing.isFeatured,
      featuredExpiresAt: listing.featuredExpiresAt?.toISOString() ?? null,
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
      audienceCountry: listing.audienceCountry ?? null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      ...(listing.media && { media: listing.media }),
    };
  }
}
