import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BankModule } from './bank/bank.module';
import dbConfig from './config/db.config';
import { InventoryModule } from './inventory/inventory.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { AccountModule } from './account/account.module';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { TenantGuard } from './tenant/guards/tenant.guard';
import { VendorModule } from './vendor/vendor.module';
import { CustomerModule } from './customer/customer.module';
import { ExpenseModule } from './expense/expense.module';
import { JournalModule } from './journal/journal.module';
import { CommonModule } from './common/common.module';
import { SaleModule } from './sale/sale.module';
import { RedisModule } from './redis/redis.module';
import { PurchaseModule } from './purchase/purchase.module';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfig, redisConfig],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
    AuthModule,
    UsersModule,
    InventoryModule,
    AccountModule,
    BankModule,
    RefreshTokensModule,
    TenantModule,
    VendorModule,
    CustomerModule,
    ExpenseModule,
    JournalModule,
    CommonModule,
    SaleModule,
    RedisModule,
    PurchaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
