import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { RbacService } from '../common/services/rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsToRoleDto } from './dto/assign-permissions-to-role.dto';
import { AssignRoleToUserDto } from './dto/assign-role-to-user.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }
    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description ?? undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true, groupName: true } } },
        },
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.role.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Role with name "${dto.name}" already exists`);
      }
    }
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.role.delete({ where: { id } });
  }

  async setPermissionsForRole(roleId: number, dto: AssignPermissionsToRoleDto) {
    await this.findOne(roleId);
    const validPermissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
      select: { id: true },
    });
    const validIds = new Set(validPermissions.map((p) => p.id));
    const invalidIds = dto.permissionIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new NotFoundException(
        `Permission(s) not found: ${invalidIds.join(', ')}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...dto.permissionIds.map((permissionId) =>
        this.prisma.rolePermission.create({
          data: { roleId, permissionId },
        }),
      ),
    ]);
    return this.findOne(roleId);
  }

  async assignRoleToUser(
    userId: number,
    dto: AssignRoleToUserDto,
    assignedByUserId: number,
  ) {
    const role = await this.findOne(dto.roleId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId: dto.roleId },
      },
      create: {
        userId,
        roleId: dto.roleId,
        assignedBy: assignedByUserId,
        expiresAt,
      },
      update: { expiresAt, assignedBy: assignedByUserId },
    });
    return {
      message: `Role "${role.name}" assigned to user`,
      userId,
      roleId: dto.roleId,
      expiresAt,
    };
  }

  async removeRoleFromUser(userId: number, roleId: number) {
    const deleted = await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException('User role assignment not found');
    }
    return { message: 'Role removed from user', userId, roleId };
  }

  async getUserRoles(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
