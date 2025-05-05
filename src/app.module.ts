import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InventoryModule } from './inventory/inventory.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { BankModule } from './bank/bank.module';
import dbConfig from './config/db.config';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
