import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(groupName?: string) {
    const where = groupName ? { groupName } : undefined;
    return this.prisma.permission.findMany({
      where,
      orderBy: [{ groupName: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async getGroupNames() {
    const result = await this.prisma.permission.findMany({
      where: { groupName: { not: null } },
      select: { groupName: true },
      distinct: ['groupName'],
    });
    return result
      .map((r) => r.groupName)
      .filter((g): g is string => g != null)
      .sort();
  }
}
