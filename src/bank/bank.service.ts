import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { JournalService } from 'src/journal/journal.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { ALLOWED_FILTERS } from './constants/bank.constants';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { Bank } from './entity/bank.entity';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Bank) private bankRepository: Repository<Bank>,
    private readonly tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
    private readonly journalService: JournalService, // Inject JournalService
  ) {}

  async findAll(filters: Record<string, any>): Promise<Paginated<Bank>> {
    try {
      const tenantId = this.tenantContextService.getTenantId();
      const queryBuilder = this.bankRepository
        .createQueryBuilder('bank')
        .where('bank.tenant.id = :tenantId', { tenantId });

      const { page, limit, ...filterFields } = filters;

      Object.entries(filterFields).forEach(([key, value]) => {
        if (value && ALLOWED_FILTERS.includes(key)) {
          queryBuilder.andWhere(`bank.${key} ILIKE :${key}`, {
            [key]: `%${value}%`,
          });
        }
      });

      const paginated = await paginate(queryBuilder, page, limit);
      paginated.data = paginated.data.map((item) => {
        const instance = plainToInstance(Bank, item);
        return instance;
      });
      return paginated;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findOne(id: string) {
    const tenantId = this.tenantContextService.getTenantId();
    return await this.bankRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });
  }

  async update(
    id: string,
    updateBankDto: UpdateBankDto,
    queryRunner: QueryRunner,
  ) {
    const tenantId = this.tenantContextService.getTenantId();
    const bank = await queryRunner.manager
      .createQueryBuilder(Bank, 'bank')
      .where('bank.id = :id', { id })
      .andWhere('bank.tenant.id = :tenantId', { tenantId })
      .getOne();

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    const oldBalance = Number(bank.currentBalance);
    Object.assign(bank, updateBankDto);
    const updatedBank = await queryRunner.manager.save(Bank, bank);
    const instance = plainToInstance(Bank, updatedBank);

    const accounts = await this.accountService.findByEntityIdAndType(
      id,
      'bank',
    );

    if (!accounts?.length) {
      throw new NotFoundException(`Accounts not found for bank with ID ${id}`);
    }
    // Find debit and credit accounts
    const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
    const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
    if (!debitAccount || !creditAccount) {
      throw new NotFoundException('Debit or Credit account not found for bank');
    }
    // Calculate value difference
    const newBalance = Number(instance.currentBalance);
    const diff = newBalance - oldBalance;
    if (diff !== 0) {
      // Create adjustment journal entry
      await this.journalService.create(
        {
          ref: `BANK-ADJ-${instance.code}-${Date.now()}`,
          date: new Date(),
          description: `Bank balance adjustment for ${instance.name}`,
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
        queryRunner,
      );
    }
    return updatedBank;
  }

  async remove(id: string, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId();
    const bank = await queryRunner.manager
      .createQueryBuilder(Bank, 'bank')
      .where('bank.id = :id', { id })
      .andWhere('bank.tenant.id = :tenantId', { tenantId })
      .getOne();

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    const accounts = await this.accountService.findByEntityIdAndType(
      id,
      EntityType.BANK,
    );
    if (!accounts?.length) {
      throw new NotFoundException(`Accounts not found for bank with ID ${id}`);
    }
    // Find debit and credit accounts
    const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
    const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
    if (!debitAccount || !creditAccount) {
      throw new NotFoundException('Debit or Credit account not found for bank');
    }
    // Create reversal journal entry for the remaining bank balance
    const amount = Number(bank.currentBalance);
    if (amount !== 0) {
      await this.journalService.create(
        {
          ref: `BANK-DEL-${bank.code}-${Date.now()}`,
          date: new Date(),
          description: `Bank deletion for ${bank.name}`,
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
        queryRunner,
      );
    }
    await Promise.all(
      accounts.map((account) =>
        this.accountService.delete(account.id, queryRunner),
      ),
    );
    await queryRunner.manager.softDelete(Bank, id);
    return { message: 'Bank deleted successfully' };
  }

  async create(
    createBankDto: CreateBankDto,
    queryRunner: QueryRunner,
  ): Promise<Bank> {
    const tenantId = this.tenantContextService.getTenantId();
    const existingBank = await queryRunner.manager.findOne(Bank, {
      where: {
        code: createBankDto.code,
        tenant: { id: tenantId },
      },
    });

    if (existingBank) {
      throw new ConflictException('Bank code already exists');
    }

    const bank = this.bankRepository.create({
      ...createBankDto,
      tenant: { id: tenantId },
    });
    const savedBank = await queryRunner.manager.save(Bank, bank);
    const instance = plainToInstance(Bank, savedBank);

    let account = await this.accountService.findOne(
      {
        name: 'Bank Openings',
      },
      ['id'],
    );
    const creditAccount: CreateAccountDto = {
      name: instance.name,
      code: `${instance.code}-cr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: Number(account?.id),
      entityId: instance.id,
      entityType: EntityType.BANK,
      creditAmount: 0,
    };

    account = await this.accountService.findOne(
      {
        name: 'Cash & Bank',
      },
      ['id'],
    );
    const debitAccount: CreateAccountDto = {
      name: instance.name,
      code: `${instance.code}-dr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: Number(account?.id),
      entityId: instance.id,
      entityType: EntityType.BANK,
      debitAmount: 0,
    };

    const createdCreditAccount = await this.accountService.create(
      creditAccount,
      queryRunner,
    );
    const createdDebitAccount = await this.accountService.create(
      debitAccount,
      queryRunner,
    );
    // Create opening balance journal entry
    await this.journalService.create(
      {
        ref: `BANK-OPEN-${instance.code}`,
        date: new Date(),
        description: `Opening balance for bank ${instance.name}`,
        details: [
          {
            nominalAccountId: createdDebitAccount.id,
            debit: instance.currentBalance,
            credit: 0,
          },
          {
            nominalAccountId: createdCreditAccount.id,
            debit: 0,
            credit: instance.currentBalance,
          },
        ],
      },
      queryRunner,
    );
    return instance;
  }

  async incrementBalance(
    id: string,
    amount: number,
    column: string,
    queryRunner?: QueryRunner,
  ) {
    if (queryRunner) {
      await queryRunner.manager.increment(Bank, { id }, column, amount);
    } else {
      await this.bankRepository.increment({ id }, column, amount);
    }
  }
}
