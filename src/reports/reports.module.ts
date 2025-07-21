import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [JournalModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
