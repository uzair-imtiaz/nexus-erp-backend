import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entity/expense.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { BankModule } from 'src/bank/bank.module';
import { AccountModule } from 'src/account/account.module';
import { ExpenseDetail } from './entity/expense-detail.entity';
import { CommonModule } from 'src/common/common.module';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    TypeOrmModule.forFeature([ExpenseDetail]),
    TenantModule,
    BankModule,
    CommonModule,
    JournalModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
