import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/account/account.module';
import { CustomerModule } from 'src/customer/customer.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { RedisModule } from 'src/redis/redis.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { SaleInventory } from './entity/sale-inventory.entity';
import { Sale } from './entity/sale.entity';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale]),
    TypeOrmModule.forFeature([SaleInventory]),
    TenantModule,
    AccountModule,
    CustomerModule,
    InventoryModule,
    RedisModule,
  ],
  controllers: [SaleController],
  providers: [SaleService],
})
export class SaleModule {}
