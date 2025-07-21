import { Injectable } from '@nestjs/common';
import { JournalService } from 'src/journal/journal.service';
import { TrialBalanceReportDto } from './dto/trial-balance-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly journalService: JournalService) {}

  async getTrialBalance(query: TrialBalanceReportDto) {
    const journalsResponse = await this.journalService.findAll(query);

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

    const map = new Map<
      string,
      { id: string; debit: number; credit: number; name: string }
    >();

    for (const entry of accountEntries) {
      if (map.has(entry.id)) {
        const existing = map.get(entry.id)!;
        existing.debit += entry.debit;
        existing.credit += entry.credit;
      } else {
        map.set(entry.id, { ...entry });
      }
    }

    const trialBalance = Array.from(map.values());
    return trialBalance;
  }
}
