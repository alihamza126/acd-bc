import { IsInt, IsNotEmpty, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyForgotPassword2faDto {
  @IsInt()
  @Type(() => Number)
  sessionId: number;

  @IsString()
  @IsNotEmpty({ message: 'Two-factor code is required' })
  @Length(6, 6, { message: 'Two-factor code must be 6 digits' })
  twoFactorCode: string;
}
