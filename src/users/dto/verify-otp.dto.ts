import { IsNotEmpty, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Login session ID is required' })
  loginSessionId: string;

  /** Email OTP (6 digits). Either otp or twoFactorCode is accepted. */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.twoFactorCode)
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp?: string;

  /** Alias for otp – same 6-digit code from email. Either otp or twoFactorCode is accepted. */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.otp)
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  twoFactorCode?: string;
}
