import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ROLES = [
  {
    name: 'super_admin',
    description: 'Full access; can manage roles, permissions, and assign roles to users',
  },
  {
    name: 'admin',
    description: 'Can assign roles to agents (e.g. escrow agents); limited role/permission management',
  },
  {
    name: 'escrow_agent',
    description: 'Escrow agent; can manage assigned deals and escrow flows',
  },
] as const;

const PERMISSIONS = [
  { name: 'roles:read', description: 'View roles and their permissions', groupName: 'admin' },
  { name: 'roles:write', description: 'Create, update, delete roles and set role permissions', groupName: 'admin' },
  { name: 'permissions:read', description: 'View all permissions', groupName: 'admin' },
  { name: 'users:read', description: 'View users and their roles', groupName: 'admin' },
  { name: 'users:assign_role', description: 'Assign or remove roles from users (e.g. escrow agents)', groupName: 'admin' },
  { name: 'deals:read', description: 'View deals', groupName: 'deals' },
  { name: 'deals:assign_escrow', description: 'Assign escrow to deals', groupName: 'deals' },
  { name: 'escrow:manage', description: 'Manage escrow flow for assigned deals', groupName: 'deals' },
] as const;

async function main() {
  console.log('Seeding roles...');
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      create: r,
      update: { description: r.description },
    });
  }

  console.log('Seeding permissions...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      create: p,
      update: { description: p.description, groupName: p.groupName },
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'super_admin' },
    select: { id: true },
  });
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'admin' },
    select: { id: true },
  });
  const escrowAgentRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'escrow_agent' },
    select: { id: true },
  });

  const allPermissions = await prisma.permission.findMany({
    select: { id: true, name: true },
  });
  const permissionIds = allPermissions.map((p) => p.id);

  console.log('Assigning all permissions to super_admin...');
  for (const permId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: superAdminRole.id, permissionId: permId },
      },
      create: { roleId: superAdminRole.id, permissionId: permId },
      update: {},
    });
  }

  const adminPermissionNames = ['roles:read', 'permissions:read', 'users:read', 'users:assign_role'];
  const adminPermIds = allPermissions
    .filter((p) => adminPermissionNames.includes(p.name))
    .map((p) => p.id);
  console.log('Assigning admin permissions to admin role...');
  for (const permId of adminPermIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: permId },
      },
      create: { roleId: adminRole.id, permissionId: permId },
      update: {},
    });
  }

  const escrowPermissionNames = ['deals:read', 'deals:assign_escrow', 'escrow:manage'];
  const escrowPermIds = allPermissions
    .filter((p) => escrowPermissionNames.includes(p.name))
    .map((p) => p.id);
  console.log('Assigning escrow permissions to escrow_agent role...');
  for (const permId of escrowPermIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: escrowAgentRole.id, permissionId: permId },
      },
      create: { roleId: escrowAgentRole.id, permissionId: permId },
      update: {},
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
