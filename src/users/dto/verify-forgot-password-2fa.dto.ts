import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyForgotPassword2faDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Two-factor code is required' })
  @Length(6, 6, { message: 'Two-factor code must be 6 digits' })
  twoFactorCode: string;
}
