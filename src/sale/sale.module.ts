import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/account/account.module';
import { CustomerModule } from 'src/customer/customer.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { Sale } from './entity/sale.entity';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { CommonModule } from 'src/common/common.module';
import { SaleInventory } from './entity/sale-inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale]),
    TypeOrmModule.forFeature([SaleInventory]),
    TenantModule,
    AccountModule,
    CustomerModule,
    InventoryModule,
    CommonModule,
  ],
  controllers: [SaleController],
  providers: [SaleService],
})
export class SaleModule {}
