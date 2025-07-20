import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entity/purchase.entity';
import { PurchaseInventory } from './entity/purchase-inventory.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { AccountModule } from 'src/account/account.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { RedisModule } from 'src/redis/redis.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase]),
    TypeOrmModule.forFeature([PurchaseInventory]),
    TenantModule,
    AccountModule,
    RedisModule,
    InventoryModule,
    VendorModule,
    JournalModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}
