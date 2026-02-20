import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @IsNotEmpty({ message: 'Login session ID is required' })
  loginSessionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Two-factor code is required' })
  @Length(6, 6, { message: 'Two-factor code must be 6 digits' })
  twoFactorCode: string;
}
