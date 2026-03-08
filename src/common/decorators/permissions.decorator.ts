import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require the user to have at least one of the given permissions.
 * Use with PermissionsGuard. Example: @RequirePermissions('roles:write', 'users:assign_role')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
