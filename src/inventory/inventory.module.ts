import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entity/inventory.entity';
import { Account } from 'src/account/entity/account.entity';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, Account]), TenantModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
