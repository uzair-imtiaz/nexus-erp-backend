import { Module } from '@nestjs/common';
import { EntityServiceManager } from './services/entity-service-manager.service';
import { VendorModule } from 'src/vendor/vendor.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { CustomerModule } from 'src/customer/customer.module';

@Module({
  imports: [VendorModule, InventoryModule, CustomerModule],
  providers: [EntityServiceManager],
  exports: [EntityServiceManager],
})
export class CommonModule {}
