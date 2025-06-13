import { Injectable } from '@nestjs/common';
import { AccountService } from 'src/account/account.service';
import { QueryRunner } from 'typeorm';

@Injectable()
export class TransactionService {
  constructor(private readonly accountService: AccountService) {}

  async postTransaction(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    queryRunner?: QueryRunner,
  ) {
    // Debit from one account
    await this.accountService.update(
      fromAccountId,
      { debitAmount: amount },
      queryRunner,
    );

    // Credit to another account
    await this.accountService.update(
      toAccountId,
      { creditAmount: amount },
      queryRunner,
    );
  }
}
