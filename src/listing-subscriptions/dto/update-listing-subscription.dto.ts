import { PartialType } from '@nestjs/mapped-types';
import { CreateListingSubscriptionDto } from './create-listing-subscription.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateListingSubscriptionDto extends PartialType(
  CreateListingSubscriptionDto,
) {
  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED', 'CANCELLED'])
  status?: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
}

