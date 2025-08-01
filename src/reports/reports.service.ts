import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { AccountService } from 'src/account/account.service';
import { Account } from 'src/account/entity/account.entity';
import { JournalService } from 'src/journal/journal.service';
import {
  BalanceSheetAccountDto,
  BalanceSheetResponseDto,
} from './dto/balance-sheet.dto';
import {
  JournalLedgerReportDto,
  JournalLedgerReportResponseDto,
} from './dto/journal-ledger-report.dto';
import { TrialBalanceReportDto } from './dto/trial-balance-report.dto';
import { ACCOUNT_NAMES, ACCOUNT_PATH_NAMES } from 'src/common/constants';
import {
  ProfitAndLossReportDto,
  ProfitAndLossReportResponseDto,
  ProfitAndLossSection,
} from './dto/profit-loss.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly journalService: JournalService,
    private readonly accountService: AccountService,
  ) {}

  async getTrialBalance(query: TrialBalanceReportDto) {
    query.limit = Number.MAX_SAFE_INTEGER;
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

  async getJournalLedger(query: JournalLedgerReportDto) {
    const { balance_forward = false, ...restQuery } = query;

    let accountIds = query.nominal_account_ids || [];
    const accountMap: Map<string, Partial<Account>> = new Map();

    // 1. Get all descendant nominal accounts
    if (accountIds.length > 0) {
      const descendantAccounts =
        await this.accountService.findDescendantAccounts(accountIds, [
          'id',
          'name',
        ]);
      accountIds = descendantAccounts.map((acc) => acc.id);

      // Populate accountMap with these accounts
      for (const acc of descendantAccounts) {
        accountMap.set(String(acc.id), acc);
      }
    }

    // 2. Fetch all journals in range
    const filters = {
      ...restQuery,
      nominal_account_ids: accountIds,
      limit: Number.MAX_SAFE_INTEGER,
    };
    const journalsResponse = await this.journalService.findAll(filters);
    const journals = journalsResponse.data;

    // Before balance forward, populate accountMap with accounts found in these journals
    for (const journal of journals) {
      for (const detail of journal.details) {
        const acc = detail.nominalAccount;
        if (acc && !accountMap.has(acc.id)) {
          accountMap.set(String(acc.id), { id: acc.id, name: acc.name });
        }
      }
    }

    // 3. Fetch balance forwarding if enabled & accumulate debit, credit, balance
    const balanceForwardMap: Record<
      string,
      { debit: number; credit: number; balance: number }
    > = {};

    if (balance_forward && query.date_from) {
      const dateBefore = dayjs(query.date_from)
        .subtract(1, 'day')
        .format('YYYY-MM-DD');

      const bfJournals = await this.journalService.findAll({
        ...restQuery,
        date_from: undefined,
        date_to: dateBefore,
        nominal_account_ids: accountIds,
        limit: Number.MAX_SAFE_INTEGER,
      });

      // Add bfJournal accounts and accumulate amounts
      for (const journal of bfJournals.data) {
        for (const detail of journal.details) {
          const acc = detail.nominalAccount;
          if (acc && !accountMap.has(acc.id)) {
            accountMap.set(String(acc.id), { id: acc.id, name: acc.name });
          }

          const accId = acc?.id;
          if (!accId || (accountIds.length && !accountIds.includes(accId)))
            continue;

          if (!balanceForwardMap[accId]) {
            balanceForwardMap[accId] = { debit: 0, credit: 0, balance: 0 };
          }

          const debit = Number(detail.debit || 0);
          const credit = Number(detail.credit || 0);

          balanceForwardMap[accId].debit += debit;
          balanceForwardMap[accId].credit += credit;
          balanceForwardMap[accId].balance += debit - credit;
        }
      }
    }

    // 4. Flatten journal details into rows
    const rows: JournalLedgerReportResponseDto[] = [];
    for (const journal of journals) {
      for (const detail of journal.details) {
        const acc = detail.nominalAccount;
        if (!acc || (accountIds.length && !accountIds.includes(acc.id)))
          continue;

        rows.push({
          id: journal.id,
          date: journal.date,
          ref: journal.ref,
          description: detail.description,
          account: accountMap.get(acc.id) || acc,
          debit: Number(detail.debit || 0),
          credit: Number(detail.credit || 0),
        });
      }
    }

    // 6. Calculate running balances
    const runningBalance: Record<string, number> = {
      ...Object.fromEntries(
        Object.entries(balanceForwardMap).map(([accId, vals]) => [
          accId,
          vals.balance,
        ]),
      ),
    };

    for (const row of rows) {
      const accId = row.account.id!;
      const prev = runningBalance[accId] || 0;
      const newBalance = prev + row.debit - row.credit;
      row.balance = newBalance;
      runningBalance[accId] = newBalance;
    }

    // 7. Add balance forwarding rows upfront with debit and credit
    const openingRows: JournalLedgerReportResponseDto[] = [];
    if (balance_forward) {
      for (const accId in balanceForwardMap) {
        const account = accountMap.get(accId);
        if (!account) continue;
        const bf = balanceForwardMap[accId];
        openingRows.push({
          id: accId,
          ref: 'BF',
          date: account.createdAt,
          description: 'Balance Forwarded',
          account,
          debit: bf.debit,
          credit: bf.credit,
          balance: bf.balance,
        });
      }
    }

    return [...openingRows, ...rows];
  }

  async getProfitAndLoss(
    query: ProfitAndLossReportDto,
  ): Promise<ProfitAndLossReportResponseDto> {
    // Fetch all journals within the date range
    const journals = await this.journalService.findAll({
      ...query,
      limit: Number.MAX_SAFE_INTEGER,
    });

    // Flatten all journal details
    const allDetails = journals.data.flatMap((j) => j.details);

    // Group by nominal account name
    const grouped: Record<string, { account: Account; amount: number }> = {};

    for (const detail of allDetails) {
      const name = detail.nominalAccount.name;
      if (!grouped[name]) {
        grouped[name] = {
          account: detail.nominalAccount,
          amount: 0,
        };
      }

      grouped[name].amount +=
        Number(detail.credit || 0) - Number(detail.debit || 0);
    }

    const buildSection = (names: string[], label: string) => {
      const section: ProfitAndLossSection = {
        name: label,
        total: 0,
        accounts: [],
      };

      for (const name of names) {
        if (!grouped[name]) continue;
        const entry = grouped[name];
        const amount = entry.amount;

        section.accounts.push({
          id: entry.account.id,
          name: entry.account.name,
          amount,
        });

        section.total += amount;
      }

      return section;
    };

    // Build each section based on known account name(s)
    const turnover = buildSection(
      [ACCOUNT_NAMES.PRODUCT_SALE_INCOME],
      'Turnover',
    );
    const discountAllowed = buildSection(
      [ACCOUNT_NAMES.DISCOUNT_ALLOWED],
      'Discount Allowed',
    );
    turnover.accounts.push(...discountAllowed.accounts);
    turnover.total += discountAllowed.total;

    const costOfSales = buildSection(
      [ACCOUNT_NAMES.COST_OF_SALES],
      'Cost of Sales',
    );
    const discountReceived = buildSection(
      ['Discount Received'],
      'Discount Received',
    );
    costOfSales.accounts.push(...discountReceived.accounts);
    costOfSales.total += discountReceived.total;

    const grossProfit = turnover.total + costOfSales.total;

    const operatingExpenses = buildSection(
      [ACCOUNT_NAMES.OPERATING_EXPENSES],
      'Operating Expenses',
    );

    const operatingProfit = grossProfit + operatingExpenses.total;

    const nonOperatingExpenses = buildSection(
      [ACCOUNT_NAMES.NON_OPERATING_EXPENSES],
      'Non-Operating Expenses',
    );

    const earningsBeforeTax = operatingProfit + nonOperatingExpenses.total;

    return {
      turnover,
      costOfSales,
      grossProfit,
      operatingProfit,
      operatingExpenses,
      nonOperatingExpenses,
      earningsBeforeTax,
      dateFrom: query.date_from,
      dateTo: query.date_to,
    };
  }

  async getBalanceSheet(asOfDate?: Date): Promise<BalanceSheetResponseDto> {
    if (!asOfDate) {
      asOfDate = new Date();
    }
    const journals = await this.journalService.findAll({
      date_to: asOfDate,
      limit: Number.MAX_SAFE_INTEGER,
    });

    const accountTotals: Record<
      string,
      { account: Account; debit: number; credit: number }
    > = {};

    for (const journal of journals.data) {
      for (const detail of journal.details) {
        const accId = detail.nominalAccount.id;

        if (!accountTotals[accId]) {
          accountTotals[accId] = {
            account: detail.nominalAccount,
            debit: 0,
            credit: 0,
          };
        }

        accountTotals[accId].debit += Number(detail.debit);
        accountTotals[accId].credit += Number(detail.credit);
      }
    }

    const sections: {
      assets: {
        current: BalanceSheetAccountDto[];
        nonCurrent: BalanceSheetAccountDto[];
      };
      liabilities: BalanceSheetAccountDto[];
      equity: BalanceSheetAccountDto[];
    } = {
      assets: { current: [], nonCurrent: [] },
      liabilities: [],
      equity: [],
    };

    for (const accId in accountTotals) {
      const { account, debit, credit } = accountTotals[accId];
      const balance = debit - credit;

      const entry = {
        name: account.name,
        balance,
      };

      if (account.pathName.includes(ACCOUNT_PATH_NAMES.CURRENT_ASSETS)) {
        sections.assets.current.push(entry);
      } else if (
        account.pathName.includes(ACCOUNT_PATH_NAMES.NON_CURRENT_ASSETS)
      ) {
        sections.assets.nonCurrent.push(entry);
      } else if (account.pathName.startsWith(ACCOUNT_PATH_NAMES.LIABILITIES)) {
        sections.liabilities.push(entry);
      } else if (account.pathName.startsWith(ACCOUNT_PATH_NAMES.EQUITY)) {
        sections.equity.push(entry);
      }
    }

    // 4. Totals
    const sum = (arr: BalanceSheetAccountDto[]): number =>
      Array.isArray(arr)
        ? arr.reduce((total, acc) => total + (acc.balance ?? 0), 0)
        : 0;

    return {
      asOf: asOfDate,
      assets: {
        current: {
          accounts: sections.assets.current,
          total: sum(sections.assets.current),
        },
        nonCurrent: {
          accounts: sections.assets.nonCurrent,
          total: sum(sections.assets.nonCurrent),
        },
      },
      liabilities: {
        accounts: sections.liabilities,
        total: sum(sections.liabilities),
      },
      equity: {
        accounts: sections.equity,
        total: sum(sections.equity),
      },
      totalLiabilitiesAndEquity:
        sum(sections.liabilities) + sum(sections.equity),
    };
  }
}
