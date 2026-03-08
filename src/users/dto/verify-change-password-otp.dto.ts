import { IsInt, IsNotEmpty, IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyChangePasswordOtpDto {
  @IsInt()
  @Type(() => Number)
  sessionId: number;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.twoFactorCode)
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.otp)
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  twoFactorCode?: string;
}
