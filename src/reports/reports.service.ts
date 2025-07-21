import { Injectable } from '@nestjs/common';
import { JournalService } from 'src/journal/journal.service';
import { TrialBalanceReportDto } from './dto/trial-balance-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly journalService: JournalService) {}

  async getTrialBalance(query: TrialBalanceReportDto) {
    const { date_from, date_to, nominal_account_ids } = query;

    const params: any = {
      date_from,
      date_to,
    };
    if (nominal_account_ids?.length) {
      params.nominal_account_ids = nominal_account_ids;
    }
    const journalsResponse = await this.journalService.findAll(params);

    const journals = journalsResponse.data;

    const accountEntries = journals.flatMap((journal) =>
      journal.details.map((detail) => {
        const amount = Number(detail.debit || 0) - Number(detail.credit || 0);
        return {
          id: detail.nominalAccount?.id,
          name: detail.nominalAccount?.name,
          date: journal.date,
          debit: amount > 0 ? amount : 0,
          credit: amount < 0 ? Math.abs(amount) : 0,
        };
      }),
    );

    return accountEntries;
  }
}
