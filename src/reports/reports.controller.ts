import { Controller, Get, Query } from '@nestjs/common';
import { DefaultDatePipe } from 'src/common/pipes/default-date-validation.pipe';
import { JournalLedgerReportDto } from './dto/journal-ledger-report.dto';
import { TrialBalanceReportDto } from './dto/trial-balance-report.dto';
import { ReportsService } from './reports.service';
import { ProfitAndLossReportDto } from './dto/profit-loss.dto';

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

  @Get('profit-and-loss')
  async getProfitAndLoss(@Query() query: ProfitAndLossReportDto) {
    return this.reportsService.getProfitAndLoss(query);
  }

  @Get('balance-sheet')
  async getBalanceSheet(@Query('date', new DefaultDatePipe()) asOf: Date) {
    return this.reportsService.getBalanceSheet(asOf);
  }
}
