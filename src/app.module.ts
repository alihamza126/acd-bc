import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { QueueModule } from './common/queues/queue.module';
import { ServicesModule } from './common/services/services.module';
import { GuardsModule } from './common/guards/guards.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { ListingsModule } from './listings/listings.module';
import { ListingSubscriptionsModule } from './listing-subscriptions/listing-subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    ServicesModule,
    QueueModule,
    GuardsModule,
    UsersModule,
    AdminModule,
    ListingsModule,
    ListingSubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
