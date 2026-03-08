import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';

@Module({
  controllers: [AdminController],
  providers: [RolesService, PermissionsService],
  exports: [RolesService, PermissionsService],
})
export class AdminModule {}
