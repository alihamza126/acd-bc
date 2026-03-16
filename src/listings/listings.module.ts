import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsVerificationService } from './listings-verification.service';
import { ListingsInfoService } from './listings-info.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, ListingsVerificationService, ListingsInfoService],
  exports: [ListingsService],
})
export class ListingsModule {}
