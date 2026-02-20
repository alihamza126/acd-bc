import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  private readonly logger = new Logger(BasicAuthGuard.name);
  private readonly envUsername: string | undefined;
  private readonly envPassword: string | undefined;

  constructor(private configService: ConfigService) {
    this.envUsername = this.configService.get<string>('BASIC_AUTH_USERNAME');
    this.envPassword = this.configService.get<string>('BASIC_AUTH_PASSWORD');

    if (!this.envUsername || !this.envPassword) {
      this.logger.warn(
        'BASIC_AUTH_USERNAME or BASIC_AUTH_PASSWORD not set. Basic auth is disabled.',
      );
    } else {
      this.logger.log('Basic authentication is enabled at application level');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!this.envUsername || !this.envPassword) {
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException(
        'Basic authentication required. Please provide Authorization header with Basic credentials.',
      );
    }

    try {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (!username || !password) {
        throw new UnauthorizedException('Invalid basic authentication format');
      }

      if (username === this.envUsername && password === this.envPassword) {
        request.basicAuthValid = true;
        return true;
      }

      throw new UnauthorizedException('Invalid basic authentication credentials');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid basic authentication header format');
    }
  }
}
