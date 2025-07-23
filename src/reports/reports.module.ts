import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { JournalModule } from 'src/journal/journal.module';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports: [JournalModule, AccountModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
