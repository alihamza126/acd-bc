import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRoleToUserDto {
  @IsInt()
  @Type(() => Number)
  roleId: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
