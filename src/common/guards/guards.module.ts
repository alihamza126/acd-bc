import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BasicAuthGuard } from './basic-auth.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [PassportModule, JwtModule],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    BasicAuthGuard,
    RolesGuard,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: BasicAuthGuard,
    },
  ],
  exports: [JwtAuthGuard, BasicAuthGuard, RolesGuard, PermissionsGuard],
})
export class GuardsModule {}
