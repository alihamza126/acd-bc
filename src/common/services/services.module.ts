import { Global, Module } from '@nestjs/common';
import { AuthTokenStoreService } from './auth-token-store.service';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { StorageService } from './storage.service';
import { RbacService } from './rbac.service';

@Global()
@Module({
  providers: [
    AuthTokenStoreService,
    EmailService,
    RedisService,
    StorageService,
    RbacService,
  ],
  exports: [
    AuthTokenStoreService,
    EmailService,
    RedisService,
    StorageService,
    RbacService,
  ],
})
export class ServicesModule {}
