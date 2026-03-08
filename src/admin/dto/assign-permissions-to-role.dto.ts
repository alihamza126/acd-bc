import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class AssignPermissionsToRoleDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsInt({ each: true })
  permissionIds: number[];
}
