import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsToRoleDto } from './dto/assign-permissions-to-role.dto';
import { AssignRoleToUserDto } from './dto/assign-role-to-user.dto';

const ADMIN_ROUTES = 'admin';

@Controller(ADMIN_ROUTES)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ---------- Roles ----------
  @Get('roles')
  @RequirePermissions('roles:read', 'roles:write')
  getRoles() {
    return this.rolesService.findAll();
  }

  @Get('roles/:id')
  @RequirePermissions('roles:read', 'roles:write')
  getRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post('roles')
  @RequirePermissions('roles:write')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put('roles/:id')
  @RequirePermissions('roles:write')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles:write')
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('roles:write')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  setRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsToRoleDto,
  ) {
    return this.rolesService.setPermissionsForRole(id, dto);
  }

  // ---------- Permissions ----------
  @Get('permissions')
  @RequirePermissions('roles:read', 'permissions:read', 'roles:write')
  getPermissions(@Query('group') group?: string) {
    return this.permissionsService.findAll(group);
  }

  @Get('permissions/groups')
  @RequirePermissions('roles:read', 'permissions:read', 'roles:write')
  getPermissionGroups() {
    return this.permissionsService.getGroupNames();
  }

  // ---------- User roles (assign role to user / agents) ----------
  @Get('users/:userId/roles')
  @RequirePermissions('users:read', 'users:assign_role')
  getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.rolesService.getUserRoles(userId);
  }

  @Post('users/:userId/roles')
  @RequirePermissions('users:assign_role')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  assignRoleToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignRoleToUserDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.rolesService.assignRoleToUser(userId, dto, req.user.id);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermissions('users:assign_role')
  removeRoleFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId);
  }
}
