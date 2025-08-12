import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entity/payment.entity';
import { JournalModule } from 'src/journal/journal.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { AccountModule } from 'src/account/account.module';
import { CommonModule } from 'src/common/common.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { PurchaseModule } from 'src/purchase/purchase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    JournalModule,
    VendorModule,
    AccountModule,
    TenantModule,
    CommonModule,
    PurchaseModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
