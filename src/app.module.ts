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
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { TenantGuard } from './tenant/guards/tenant.guard';
import { VendorModule } from './vendor/vendor.module';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [dbConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
    AuthModule,
    UsersModule,
    InventoryModule,
    SubcategoriesModule,
    BankModule,
    RefreshTokensModule,
    TenantModule,
    VendorModule,
    CustomerModule,
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
