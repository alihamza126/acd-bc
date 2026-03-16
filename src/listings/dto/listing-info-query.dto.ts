import { IsNotEmpty, IsUrl, MaxLength } from 'class-validator';

export class ListingInfoQueryDto {
  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}
