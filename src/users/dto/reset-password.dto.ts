import { IsInt, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class ResetPasswordDto {
  @IsInt()
  @Type(() => Number)
  sessionId: number;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}
