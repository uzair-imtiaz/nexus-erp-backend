import { Controller, Get, Query } from '@nestjs/common';
import { DefaultDatePipe } from 'src/common/pipes/default-date-validation.pipe';
import { JournalLedgerReportDto } from './dto/journal-ledger-report.dto';
import { TrialBalanceReportDto } from './dto/trial-balance-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  async getTrialBalance(@Query() query: TrialBalanceReportDto) {
    return this.reportsService.getTrialBalance(query);
  }

  @Get('journal-ledger')
  async getJournalLedger(@Query() query: JournalLedgerReportDto) {
    return this.reportsService.getJournalLedger(query);
  }

  @Get('balance-sheet')
  async(@Query('date', new DefaultDatePipe()) asOf: Date) {
    return this.reportsService.getBalanceSheet(asOf);
  }
}
