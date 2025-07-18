import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { Bank } from './entity/bank.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { AccountModule } from 'src/account/account.module';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { DataSource } from 'typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bank]),
    TenantModule,
    AccountModule,
    AuthModule,
    forwardRef(() => JournalModule),
  ],
  controllers: [BankController],
  providers: [
    BankService,
    {
      provide: TransactionInterceptor,
      useFactory: (dataSource: DataSource) =>
        new TransactionInterceptor(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [BankService],
})
export class BankModule {}
