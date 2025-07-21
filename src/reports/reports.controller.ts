import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TrialBalanceReportDto } from './dto/trial-balance-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  async getTrialBalance(@Query() query: TrialBalanceReportDto) {
    return this.reportsService.getTrialBalance(query);
  }
}
