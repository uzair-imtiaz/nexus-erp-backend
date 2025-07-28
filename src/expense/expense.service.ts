import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Expense } from './entity/expense.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { plainToInstance } from 'class-transformer';
import { BankService } from 'src/bank/bank.service';
import { AccountService } from 'src/account/account.service';
import { ExpenseDetail } from './entity/expense-detail.entity';

import { updateExpenseDto } from './dto/update-expense.dto';
import { Bank } from 'src/bank/entity/bank.entity';
import { EntityServiceManager } from 'src/common/services/entity-service-manager.service';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { AccountManagerService } from 'src/common/services/account-manager.service';
import { JournalService } from 'src/journal/journal.service';
import {
  CreateJournalDto,
  JournalDetailDto,
} from 'src/journal/dto/create-journal.dto';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense) private expenseRepository: Repository<Expense>,
    @InjectRepository(ExpenseDetail)
    private expenseDetailRepository: Repository<ExpenseDetail>,
    private tenantContextService: TenantContextService,
    private bankService: BankService,
    private accountService: AccountService,
    private readonly entityServiceManager: EntityServiceManager,
    private readonly accountManagerService: AccountManagerService,
    private readonly journalService: JournalService,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const bank = await this.bankService.findOne(createExpenseDto.bankId);

    if (!bank) throw new NotFoundException('Bank not found');

    const totalAmount = createExpenseDto.details.reduce(
      (sum, detail) => sum + detail.amount,
      0,
    );

    const expense = this.expenseRepository.create({
      bank,
      totalAmount,
      description: createExpenseDto.description,
      tenant: { id: tenantId },
    });

    const savedExpense = await queryRunner.manager.save(Expense, expense);

    const details: ExpenseDetail[] = [];
    const journalDetails: JournalDetailDto[] = [];

    for (const detail of createExpenseDto.details) {
      const account = await this.accountManagerService.getValidAccount(
        detail.nominalAccountId,
        tenantId,
        queryRunner,
      );

      // Create ExpenseDetail
      const expenseDetail = this.expenseDetailRepository.create({
        nominalAccount: { id: detail.nominalAccountId },
        expense: savedExpense,
        amount: detail.amount,
        description: detail.description,
        tenant: { id: tenantId },
      });

      details.push(expenseDetail);

      // Create journal debit entry
      journalDetails.push({
        nominalAccountId: account.id,
        debit: detail.amount,
        credit: 0,
        description: detail.description || `Expense - ${account.name}`,
      });
    }

    await queryRunner.manager.save(ExpenseDetail, details);

    // Bank account journal (credit)
    const bankAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        bank.id,
        EntityType.BANK,
      );

    journalDetails.push({
      nominalAccountId: bankAccount.id,
      debit: 0,
      credit: totalAmount,
      description: `Expense payment - ${savedExpense.description || savedExpense.id}`,
    });

    // Create journal
    const journalDto: CreateJournalDto = {
      details: journalDetails,
      ref: `EXP-${savedExpense.id}`,
      date: new Date(), // Need to change. Introduce a date at the root of expense
      description: `Expense transaction - ${savedExpense.description || savedExpense.id}`,
    };

    const journal = await this.journalService.create(journalDto, queryRunner);

    // Link journal to expense
    savedExpense.journal = journal;
    await queryRunner.manager.save(Expense, savedExpense);

    return plainToInstance(Expense, savedExpense);
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Expense>> {
    const tenantId = this.tenantContextService.getTenantId();

    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.bank', 'bank')
      .leftJoinAndSelect('expense.details', 'details')
      .leftJoinAndSelect('details.nominalAccount', 'nominalAccount')
      .where('expense.tenant.id = :tenantId', { tenantId });

    const { page, limit, bank_id, nominal_account_ids, date_from, date_to } =
      filters;

    if (bank_id) {
      queryBuilder.andWhere('expense.bank_id = :bankId', {
        bankId: bank_id as string,
      });
    }

    if (
      nominal_account_ids &&
      Array.isArray(nominal_account_ids) &&
      nominal_account_ids.length
    ) {
      queryBuilder.andWhere(
        'details.nominal_account_id IN (:...nominalAccountIds)',
        {
          nominalAccountIds: nominal_account_ids,
        },
      );
    }

    if (date_from) {
      queryBuilder.andWhere('expense.created_at >= :dateFrom', {
        dateFrom: date_from as string,
      });
    }
    if (date_to) {
      queryBuilder.andWhere('expense.created_at <= :dateTo', {
        dateTo: date_to as string,
      });
    }

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) =>
      plainToInstance(Expense, item),
    );

    return paginated;
  }

  async findOne(id: string): Promise<Expense> {
    const tenantId = this.tenantContextService.getTenantId();
    const expense = await this.expenseRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['bank', 'details', 'details.nominalAccount'],
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return plainToInstance(Expense, expense);
  }

  async update(id: string, data: updateExpenseDto, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;

    const existingExpense = await queryRunner.manager.findOne(Expense, {
      where: { id, tenant: { id: tenantId } },
      relations: ['bank', 'details', 'details.nominalAccount'],
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    if (!data.details || !Array.isArray(data.details)) {
      throw new BadRequestException('Expense details are required');
    }

    const newTotalAmount = data.details.reduce(
      (sum, detail) => sum + Number(detail.amount),
      0,
    );

    // Create reversal journal entry for the old expense
    const reversalJournalDetails: JournalDetailDto[] = [];

    // Reverse bank account (credit the bank back)
    const oldBankAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        existingExpense.bank.id,
        EntityType.BANK,
      );

    reversalJournalDetails.push({
      nominalAccountId: oldBankAccount.id,
      debit: existingExpense.totalAmount,
      credit: 0,
      description: `Expense reversal - ${existingExpense.description || existingExpense.id}`,
    });

    // Reverse each expense account (credit the expense accounts back)
    for (const detail of existingExpense.details) {
      const account = await this.accountManagerService.getValidAccount(
        detail.nominalAccount.id,
        tenantId,
        queryRunner,
      );

      reversalJournalDetails.push({
        nominalAccountId: account.id,
        debit: 0,
        credit: detail.amount,
        description: `Expense reversal - ${detail.description || account.name}`,
      });
    }

    // Create reversal journal entry
    const reversalJournalDto: CreateJournalDto = {
      details: reversalJournalDetails,
      ref: `EXP-REV-${existingExpense.id}`,
      date: new Date(),
      description: `Expense reversal - ${existingExpense.description || existingExpense.id}`,
    };

    await this.journalService.create(reversalJournalDto, queryRunner);

    // Update expense details
    const isBankChanged =
      data.bankId && data.bankId !== String(existingExpense.bank.id);

    if (isBankChanged) {
      const newBank = await queryRunner.manager.findOne(Bank, {
        where: { id: data.bankId, tenant: { id: tenantId } },
      });

      if (!newBank) {
        throw new NotFoundException(`Bank with ID ${data.bankId} not found`);
      }

      existingExpense.bank = newBank;
    }

    // Map for existing details
    const existingDetailsMap = new Map(
      existingExpense.details.map((detail) => [
        String(detail.nominalAccount.id),
        detail,
      ]),
    );

    // Remove details no longer present in the new data
    for (const oldDetail of existingExpense.details) {
      const isRemoved = !data.details.some(
        (d) => d.nominalAccountId === String(oldDetail.nominalAccount.id),
      );

      if (isRemoved) {
        await queryRunner.manager.remove(oldDetail);
      }
    }

    // Add new / update existing details
    for (const newDetail of data.details) {
      const oldDetail = existingDetailsMap.get(newDetail.nominalAccountId);

      // Update existing detail
      if (oldDetail) {
        oldDetail.amount = newDetail.amount;
        if (newDetail.description)
          oldDetail.description = newDetail.description;
        await queryRunner.manager.save(oldDetail);
      } else {
        // Create new detail
        const account = await this.accountManagerService.getValidAccount(
          newDetail.nominalAccountId,
          tenantId,
          queryRunner,
        );

        const expenseDetail = queryRunner.manager.create(ExpenseDetail, {
          amount: newDetail.amount,
          description: newDetail.description,
          nominalAccount: account,
          expense: existingExpense,
          tenant: { id: tenantId },
        });
        await queryRunner.manager.save(expenseDetail);
      }
    }

    // Create new journal entries for the updated expense
    const newJournalDetails: JournalDetailDto[] = [];

    // Debit bank account (cash/bank going out)
    const bankAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        existingExpense.bank.id,
        EntityType.BANK,
      );

    newJournalDetails.push({
      nominalAccountId: bankAccount.id,
      debit: 0,
      credit: newTotalAmount,
      description: `Expense payment - ${data.description || existingExpense.id}`,
    });

    // Credit each expense account (expense accounts being debited)
    for (const detail of data.details) {
      const account = await this.accountManagerService.getValidAccount(
        detail.nominalAccountId,
        tenantId,
        queryRunner,
      );

      newJournalDetails.push({
        nominalAccountId: account.id,
        debit: detail.amount,
        credit: 0,
        description: detail.description || `Expense - ${account.name}`,
      });
    }

    // Create new journal entry
    const newJournalDto: CreateJournalDto = {
      details: newJournalDetails,
      ref: `EXP-${existingExpense.id}`,
      date: new Date(),
      description: `Expense transaction - ${data.description || existingExpense.id}`,
    };

    const newJournal = await this.journalService.create(
      newJournalDto,
      queryRunner,
    );

    // Update expense
    existingExpense.totalAmount = newTotalAmount;
    existingExpense.description = data.description;
    existingExpense.journal = newJournal;
    await queryRunner.manager.save(Expense, existingExpense);

    return plainToInstance(Expense, existingExpense);
  }

  async delete(id: string, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;

    // Find existing expense with details
    const existingExpense = await queryRunner.manager.findOne(Expense, {
      where: { id, tenant: { id: tenantId } },
      relations: ['bank', 'details'],
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    // Create reversal journal entry for the expense
    const reversalJournalDetails: JournalDetailDto[] = [];

    // Reverse bank account (credit the bank back)
    const bankAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        existingExpense.bank.id,
        EntityType.BANK,
      );

    reversalJournalDetails.push({
      nominalAccountId: bankAccount.id,
      debit: existingExpense.totalAmount,
      credit: 0,
      description: `Expense deletion reversal - ${existingExpense.description || existingExpense.id}`,
    });

    // Reverse each expense account (credit the expense accounts back)
    for (const detail of existingExpense.details) {
      const account = await this.accountManagerService.getValidAccount(
        detail.nominalAccount.id,
        tenantId,
        queryRunner,
      );

      reversalJournalDetails.push({
        nominalAccountId: account.id,
        debit: 0,
        credit: detail.amount,
        description: `Expense deletion reversal - ${detail.description || account.name}`,
      });
    }

    // Create reversal journal entry
    const reversalJournalDto: CreateJournalDto = {
      details: reversalJournalDetails,
      ref: `EXP-DEL-${existingExpense.id}`,
      date: new Date(),
      description: `Expense deletion reversal - ${existingExpense.description || existingExpense.id}`,
    };

    await this.journalService.create(reversalJournalDto, queryRunner);

    // Delete expense details
    await queryRunner.manager.delete(ExpenseDetail, {
      expense: { id: existingExpense.id },
    });

    // Delete expense
    await queryRunner.manager.delete(Expense, { id: existingExpense.id });

    return { message: 'Expense deleted successfully' };
  }
}
