import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(
        `JWT auth failed: err=${err?.message ?? 'none'}, user=${!!user}, info=${info?.message ?? JSON.stringify(info)}`,
      );
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
