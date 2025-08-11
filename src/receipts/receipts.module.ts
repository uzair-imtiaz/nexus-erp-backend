import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/account/account.module';
import { CommonModule } from 'src/common/common.module';
import { JournalModule } from 'src/journal/journal.module';
import { SaleModule } from 'src/sale/sale.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { Receipt } from './entity/receipt.entity';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt]),
    JournalModule,
    SaleModule,
    TenantModule,
    CommonModule,
    AccountModule,
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
})
export class ReceiptsModule {}
