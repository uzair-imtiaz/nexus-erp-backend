import { forwardRef, Module } from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Journal } from './entity/journal.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { AccountModule } from 'src/account/account.module';
import { JournalDetail } from './entity/journal-detail.entity';
import { CommonModule } from 'src/common/common.module';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Journal]),
    TypeOrmModule.forFeature([JournalDetail]),
    TenantModule,
    AccountModule,
    forwardRef(() => CommonModule),
  ],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
