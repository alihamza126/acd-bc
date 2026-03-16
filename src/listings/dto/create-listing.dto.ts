import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  platform: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  link?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  subscribers?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyViews?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyIncome?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyExpense?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  monetizationAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  displayLink?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowComments?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  audienceCountry?: string;
}
