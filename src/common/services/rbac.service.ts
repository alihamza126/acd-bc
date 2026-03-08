import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all role names assigned to a user (only non-expired).
   */
  async getRoleNamesForUser(userId: number): Promise<string[]> {
    const now = new Date();
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { role: { select: { name: true } } },
    });
    return userRoles.map((ur) => ur.role.name);
  }

  /**
   * Get all permission names for a user (from all their roles).
   */
  async getPermissionNamesForUser(userId: number): Promise<string[]> {
    const now = new Date();
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { roleId: true },
    });
    const roleIds = userRoles.map((r) => r.roleId);
    if (roleIds.length === 0) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: { select: { name: true } } },
    });
    const names = rolePermissions.map((rp) => rp.permission.name);
    return [...new Set(names)];
  }

  /**
   * Check if user has at least one of the given roles.
   */
  async userHasRole(userId: number, roleNames: string[]): Promise<boolean> {
    const userRoles = await this.getRoleNamesForUser(userId);
    return roleNames.some((r) => userRoles.includes(r));
  }

  /**
   * Check if user has at least one of the given permissions.
   */
  async userHasPermission(
    userId: number,
    permissionNames: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getPermissionNamesForUser(userId);
    return permissionNames.some((p) => userPermissions.includes(p));
  }
}
