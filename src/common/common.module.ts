import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from 'src/account/account.module';
import { BankModule } from 'src/bank/bank.module';
import { CustomerModule } from 'src/customer/customer.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { AccountManagerService } from './services/account-manager.service';
import { EntityServiceManager } from './services/entity-service-manager.service';

@Module({
  imports: [
    VendorModule,
    forwardRef(() => InventoryModule),
    CustomerModule,
    forwardRef(() => BankModule),
    AccountModule,
  ],
  providers: [EntityServiceManager, AccountManagerService],
  exports: [EntityServiceManager, AccountManagerService],
})
export class CommonModule {}
