import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AccountService } from 'src/account/account.service';
import { ACCOUNT_IDS } from '../constants/sale.constants';
import { BaseProcessor } from 'src/queues/processors/base.processor';

export interface AccountUpdateJob {
  type: 'SALE' | 'RETURN';
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  customerId: string;
  customerAccountId: string;
}

@Processor('sales')
export class SaleProcessor extends BaseProcessor {
  constructor(private readonly accountService: AccountService) {
    super();
  }

  async process(job: Job<AccountUpdateJob>) {
    try {
      const { type, totalAmount, totalTax, totalDiscount, customerAccountId } =
        job.data;
      const accountUpdates: Promise<any>[] = [];

      // Update cost account
      accountUpdates.push(
        this.accountService.update(
          String(ACCOUNT_IDS.COST),
          {
            ...(type === 'SALE'
              ? { debitAmount: totalAmount }
              : { creditAmount: totalAmount }),
          },
          undefined,
          true,
        ),
      );

      // Update customer account
      accountUpdates.push(
        this.accountService.update(
          customerAccountId,
          {
            ...(type === 'SALE'
              ? { debitAmount: totalAmount + totalTax - totalDiscount }
              : { creditAmount: totalAmount + totalTax - totalDiscount }),
          },
          undefined,
          true,
        ),
      );

      // Update tax and discount accounts
      if (totalTax > 0) {
        accountUpdates.push(
          this.accountService.update(
            String(ACCOUNT_IDS.GST),
            {
              ...(type === 'SALE'
                ? { creditAmount: totalTax }
                : { debitAmount: totalTax }),
            },
            undefined,
            true,
          ),
        );
      }

      if (totalDiscount > 0) {
        accountUpdates.push(
          this.accountService.update(
            String(ACCOUNT_IDS.DISCOUNT),
            {
              ...(type === 'SALE'
                ? { debitAmount: totalDiscount }
                : { creditAmount: totalDiscount }),
            },
            undefined,
            true,
          ),
        );
      }

      // Update sales account
      accountUpdates.push(
        this.accountService.update(
          String(ACCOUNT_IDS.SALE),
          {
            ...(type === 'SALE'
              ? { creditAmount: totalAmount }
              : { debitAmount: totalAmount }),
          },
          undefined,
          true,
        ),
      );

      await Promise.all(accountUpdates);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.handleError(job, error);
      }
      throw error;
    }
  }
}
