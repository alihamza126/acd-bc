import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Require the user to have at least one of the given roles.
 * Use with RolesGuard. Example: @Roles('super_admin', 'escrow_agent')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
