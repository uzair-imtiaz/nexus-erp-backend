import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from 'src/account/account.module';
import { BankModule } from 'src/bank/bank.module';
import { CustomerModule } from 'src/customer/customer.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { AccountManagerService } from './services/account-manager.service';
import { EntityServiceManager } from './services/entity-service-manager.service';
import { LocalFileService } from './services/local-file.service';
import { PdfService } from './services/pdf.service';

@Module({
  imports: [
    forwardRef(() => VendorModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => BankModule),
    AccountModule,
  ],
  providers: [
    EntityServiceManager,
    AccountManagerService,
    LocalFileService,
    PdfService,
  ],
  exports: [
    EntityServiceManager,
    AccountManagerService,
    LocalFileService,
    PdfService,
  ],
})
export class CommonModule {}
