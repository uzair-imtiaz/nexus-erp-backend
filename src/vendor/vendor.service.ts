import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountService } from 'src/account/account.service';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import { UpdateContactDto } from 'src/common/dtos/update-contact-base.dto';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { GenericService } from 'src/common/services/generic.service';
import { JournalService } from 'src/journal/journal.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { Vendor } from './entity/vendor.entity';

@Injectable()
export class VendorService extends GenericService<
  Vendor,
  CreateVendorDto,
  UpdateContactDto
> {
  constructor(
    @InjectRepository(Vendor) private vendorRepository: Repository<Vendor>,
    tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
    @Inject(forwardRef(() => JournalService))
    private readonly journalService: JournalService,
  ) {
    super(vendorRepository, tenantContextService, 'vendor');
  }

  async incrementBalance(
    id: string,
    amount: number,
    column: string,
    queryRunner?: QueryRunner,
  ) {
    if (queryRunner) {
      await queryRunner.manager.increment(Vendor, { id }, column, amount);
    } else {
      await this.vendorRepository.increment({ id }, column, amount);
    }
  }

  protected async afterCreate(
    entity: Vendor,
    runner: QueryRunner,
  ): Promise<void> {
    let account = await this.accountService.findOne(
      {
        name: 'Trade Payables',
      },
      ['id'],
    );
    if (!account) {
      throw new NotFoundException('Trade Payables account not found');
    }
    const creditAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-cr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: Number(account?.id),
      entityId: entity.id,
      entityType: EntityType.VENDOR,
      creditAmount: 0,
    };

    account = await this.accountService.findOne(
      {
        name: 'Supplier Openings',
      },
      ['id'],
    );

    const debitAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-dr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: Number(account?.id),
      entityId: entity.id,
      entityType: EntityType.VENDOR,
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
        ref: `VENDOR-OPEN-${entity.code}`,
        date: entity.openingBalanceDate,
        description: `Opening balance for vendor ${entity.name}`,
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
    entity: Vendor,
    runner: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity.id,
      EntityType.VENDOR,
    );

    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for vendor with ID ${entity.id}`,
      );
    }
    // Find debit and credit accounts
    const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
    const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
    if (!debitAccount || !creditAccount) {
      throw new NotFoundException(
        'Debit or Credit account not found for vendor',
      );
    }
    // Calculate value difference
    // Fetch the previous opening balance from the database if needed
    const vendor = await this.vendorRepository.findOne({
      where: { id: entity.id },
    });
    const oldBalance = Number(vendor?.openingBalance ?? 0);
    const newBalance = Number(entity.openingBalance);
    const diff = newBalance - oldBalance;
    if (diff !== 0) {
      // Create adjustment journal entry
      await this.journalService.create(
        {
          ref: `VENDOR-ADJ-${entity.code}-${Date.now()}`,
          date: entity.openingBalanceDate,
          description: `Vendor opening balance adjustment for ${entity.name}`,
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
    entity: Vendor,
    runner: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity?.id,
      EntityType.VENDOR,
    );
    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for vendor with ID ${entity?.id}`,
      );
    }
    // Find debit and credit accounts
    const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
    const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
    if (!debitAccount || !creditAccount) {
      throw new NotFoundException(
        'Debit or Credit account not found for vendor',
      );
    }
    // Create reversal journal entry for the remaining vendor balance
    const amount = Number(entity.openingBalance);
    if (amount !== 0) {
      await this.journalService.create(
        {
          ref: `VENDOR-DEL-${entity.code}-${Date.now()}`,
          date: new Date(),
          description: `Vendor deletion for ${entity.name}`,
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
