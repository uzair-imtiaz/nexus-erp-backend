import { Module } from '@nestjs/common';
import { EntityServiceManager } from './services/entity-service-manager.service';
import { VendorModule } from 'src/vendor/vendor.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { CustomerModule } from 'src/customer/customer.module';
import { BankModule } from 'src/bank/bank.module';
import { AccountModule } from 'src/account/account.module';
import { AccountManagerService } from './services/account-manager.service';
import { TransactionService } from './services/transaction.service';

@Module({
  imports: [
    VendorModule,
    InventoryModule,
    CustomerModule,
    BankModule,
    AccountModule,
  ],
  providers: [EntityServiceManager, AccountManagerService, TransactionService],
  exports: [EntityServiceManager, AccountManagerService, TransactionService],
})
export class CommonModule {}
