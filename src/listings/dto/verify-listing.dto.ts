import { IsString, IsNotEmpty, IsIn, IsUrl, MaxLength } from 'class-validator';

export class VerifyListingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  verificationCode: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['youtube', 'instagram', 'tiktok', 'facebook'])
  socialMedia: 'youtube' | 'instagram' | 'tiktok' | 'facebook';

  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  link: string;
}
