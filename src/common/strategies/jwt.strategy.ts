import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';

const jwtLogger = new Logger('JwtStrategy');

/** Extract JWT from X-Access-Token header or Authorization: Bearer (so client can send both Basic + JWT). */
function jwtFromRequest(req: Request): string | null {
  const fromHeader = req.headers['x-access-token'];
  if (typeof fromHeader === 'string' && fromHeader.length > 0) {
    jwtLogger.log(`[JWT] extracted from X-Access-Token, length=${fromHeader.length}, first10=${fromHeader.slice(0, 10)}`);
    return fromHeader;
  }
  const fromBearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromBearer) jwtLogger.log(`[JWT] extracted from Authorization: Bearer, length=${fromBearer.length}`);
  return fromBearer;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
    const fromEnv = !!configService.get<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([jwtFromRequest]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.log(
      `[JWT] secret: ${fromEnv ? `from env (length ${secret.length})` : 'using fallback'}`,
    );
  }

  async validate(payload: any) {
    this.logger.log(`[JWT] validate: sub=${payload.sub}`);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      this.logger.warn(`JWT reject: user not found or deleted sub=${payload.sub}`);
      throw new UnauthorizedException('User not found or account deleted');
    }

    if (user.status !== 'active') {
      this.logger.warn(`JWT reject: user status not active sub=${payload.sub} status=${user.status}`);
      throw new UnauthorizedException('Account is not active');
    }

    this.logger.log(`[JWT] valid: user=${user.id}`);
    return user;
  }
}
