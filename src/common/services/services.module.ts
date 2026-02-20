import { Global, Module } from '@nestjs/common';
import { AuthTokenStoreService } from './auth-token-store.service';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    AuthTokenStoreService,
    EmailService,
    RedisService,
    StorageService,
  ],
  exports: [
    AuthTokenStoreService,
    EmailService,
    RedisService,
    StorageService,
  ],
})
export class ServicesModule {}
