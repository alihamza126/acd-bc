import { IsNotEmpty, IsString } from 'class-validator';

export class RequestChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;
}
