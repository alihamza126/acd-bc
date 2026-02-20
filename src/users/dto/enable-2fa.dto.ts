import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2faDto {
  @IsString()
  @IsNotEmpty({ message: 'Two-factor code is required' })
  @Length(6, 6, { message: 'Two-factor code must be 6 digits' })
  twoFactorCode: string;
}
