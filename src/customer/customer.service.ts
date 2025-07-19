import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountService } from 'src/account/account.service';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { GenericService } from 'src/common/services/generic.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entity/customer.entity';
import { JournalService } from 'src/journal/journal.service';

@Injectable()
export class CustomerService extends GenericService<
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto
> {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
    @Inject(forwardRef(() => JournalService))
    private readonly journalService: JournalService,
  ) {
    super(customerRepository, tenantContextService, 'customer');
  }

  async incrementBalance(
    id: string,
    amount: number,
    column: string,
    queryRunner?: QueryRunner,
  ) {
    if (queryRunner) {
      await queryRunner.manager.increment(Customer, { id }, column, amount);
    } else await this.customerRepository.increment({ id }, column, amount);
  }

  protected async afterCreate(
    entity: Customer,
    runner: QueryRunner,
  ): Promise<void> {
    let account = await this.accountService.findOne(
      {
        name: 'Customer Openings',
      },
      ['id'],
    );
    const creditAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-cr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: Number(account?.id),
      entityId: entity.id,
      entityType: EntityType.CUSTOMER,
      creditAmount: 0,
    };

    account = await this.accountService.findOne(
      {
        name: 'Trade Receivables',
      },
      ['id'],
    );
    const debitAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-dr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: Number(account?.id),
      entityId: entity.id,
      entityType: EntityType.CUSTOMER,
      debitAmount: 0,
    };
    const createdCreditAccount = await this.accountService.create(
      creditAccount,
      runner,
    );
    const createdDebitAccount = await this.accountService.create(
      debitAccount,
      runner,
    );
    // Create opening balance journal entry
    await this.journalService.create(
      {
        ref: `CUSTOMER-OPEN-${entity.code}`,
        date: new Date(),
        description: `Opening balance for customer ${entity.name}`,
        details: [
          {
            nominalAccountId: createdDebitAccount.id,
            debit: entity.openingBalance,
            credit: 0,
          },
          {
            nominalAccountId: createdCreditAccount.id,
            debit: 0,
            credit: entity.openingBalance,
          },
        ],
      },
      runner,
    );
  }

  protected async afterUpdate(
    entity: Customer,
    runner: QueryRunner,
    accountToUpdate: 'credit' | 'debit' | undefined = undefined,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity.id,
      'customer',
    );

    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for customer with ID ${entity.id}`,
      );
    }
    // Find debit and credit accounts
    const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
    const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
    if (!debitAccount || !creditAccount) {
      throw new NotFoundException(
        'Debit or Credit account not found for customer',
      );
    }
    // Calculate value difference
    // Fetch the previous opening balance from the database if needed
    const customer = await this.customerRepository.findOne({
      where: { id: entity.id },
    });
    const oldBalance = Number(customer?.openingBalance ?? 0);
    const newBalance = Number(entity.openingBalance);
    const diff = newBalance - oldBalance;
    if (diff !== 0) {
      // Create adjustment journal entry
      await this.journalService.create(
        {
          ref: `CUSTOMER-ADJ-${entity.code}-${Date.now()}`,
          date: new Date(),
          description: `Customer opening balance adjustment for ${entity.name}`,
          details:
            diff > 0
              ? [
                  {
                    nominalAccountId: debitAccount.id,
                    debit: Math.abs(diff),
                    credit: 0,
                  },
                  {
                    nominalAccountId: creditAccount.id,
                    debit: 0,
                    credit: Math.abs(diff),
                  },
                ]
              : [
                  {
                    nominalAccountId: debitAccount.id,
                    debit: 0,
                    credit: Math.abs(diff),
                  },
                  {
                    nominalAccountId: creditAccount.id,
                    debit: Math.abs(diff),
                    credit: 0,
                  },
                ],
        },
        runner,
      );
    }
  }

  protected async afterDelete(
    entity: Customer,
    runner: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity?.id,
      'customer',
    );
    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for customer with ID ${entity?.id}`,
      );
    }
    // Find debit and credit accounts
    const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
    const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
    if (!debitAccount || !creditAccount) {
      throw new NotFoundException(
        'Debit or Credit account not found for customer',
      );
    }
    // Create reversal journal entry for the remaining customer balance
    const amount = Number(entity.openingBalance);
    if (amount !== 0) {
      await this.journalService.create(
        {
          ref: `CUSTOMER-DEL-${entity.code}-${Date.now()}`,
          date: new Date(),
          description: `Customer deletion for ${entity.name}`,
          details: [
            {
              nominalAccountId: debitAccount.id,
              debit: 0,
              credit: Math.abs(amount),
            },
            {
              nominalAccountId: creditAccount.id,
              debit: Math.abs(amount),
              credit: 0,
            },
          ],
        },
        runner,
      );
    }
    await Promise.all(
      accounts.map((account) => this.accountService.delete(account.id, runner)),
    );
  }
}
