import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/account/account.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { JournalModule } from 'src/journal/journal.module';
import { RedisModule } from 'src/redis/redis.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { PurchaseInventory } from './entity/purchase-inventory.entity';
import { Purchase } from './entity/purchase.entity';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase]),
    TypeOrmModule.forFeature([PurchaseInventory]),
    TenantModule,
    AccountModule,
    RedisModule,
    InventoryModule,
    JournalModule,
    CommonModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
