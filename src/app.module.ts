import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { InventoryModule } from './inventory/inventory.module';
import { JournalModule } from './journal/journal.module';
import { PurchaseModule } from './purchase/purchase.module';
import { RedisModule } from './redis/redis.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { SaleModule } from './sale/sale.module';
import { TenantGuard } from './tenant/guards/tenant.guard';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './user/user.module';
import { VendorModule } from './vendor/vendor.module';
import { join } from 'path';
import { BulkImportModule } from './bulk-import/bulk-import.module';

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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'),
      serveRoot: '/static',
    }),
    // BulkDataModule,
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
    BulkImportModule,
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
