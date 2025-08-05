import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AccountModule } from './account/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BankModule } from './bank/bank.module';
import { CommonModule } from './common/common.module';
import dbConfig from './config/db.config';
import redisConfig from './config/redis.config';
import { CustomerModule } from './customer/customer.module';
import { ExpenseModule } from './expense/expense.module';
import { FormulationModule } from './formulation/formulation.module';
import { InventoryModule } from './inventory/inventory.module';
import { JournalModule } from './journal/journal.module';
import { ProductionModule } from './production/production.module';
import { PurchaseModule } from './purchase/purchase.module';
import { RedisModule } from './redis/redis.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { ReportsModule } from './reports/reports.module';
import { SaleModule } from './sale/sale.module';
import { TenantGuard } from './tenant/guards/tenant.guard';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './user/user.module';
import { VendorModule } from './vendor/vendor.module';

@Module({
  imports: [
    SentryModule.forRoot(),
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
    FormulationModule,
    ProductionModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
