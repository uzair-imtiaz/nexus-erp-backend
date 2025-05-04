import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entity/inventory.entity';
import { Account } from 'src/subcategories/entity/account-base.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, Account])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
