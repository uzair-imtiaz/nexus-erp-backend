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
import { UpdateBankDto } from 'src/bank/dto/update-bank.dto';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { Account } from 'src/account/entity/account.entity';
import { updateExpenseDto } from './dto/update-expense.dto';
import { Bank } from 'src/bank/entity/bank.entity';
import { EntityServiceManager } from 'src/common/services/entity-service-manager.service';
import { EntityType } from 'src/common/enums/entity-type.enum';

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
  ) {}

  async create(createExpenseDto: CreateExpenseDto, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId();
    const bank = await this.bankService.findOne(createExpenseDto.bankId);
    if (!bank) {
      throw new NotFoundException('Bank not found');
    }

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

    // Create expense details
    const details = createExpenseDto.details.map((detail) => {
      const expenseDetail = this.expenseDetailRepository.create({
        nominalAccount: { id: detail.nominalAccountId },
        expense: savedExpense,
        amount: detail.amount,
        description: detail.description,
        tenant: { id: tenantId },
      });
      return expenseDetail;
    });

    await queryRunner.manager.save(ExpenseDetail, details);

    await this.entityServiceManager.incrementEntityBalance(
      EntityType.BANK,
      bank.id,
      bank.currentBalance - totalAmount,
    );

    const bankAccount = await this.accountService.findByEntityIdAndType(
      bank.id,
      EntityType.BANK,
    );

    if (!bankAccount) {
      throw new NotFoundException(
        `Account not found for bank with ID ${bank.id}`,
      );
    }

    const CreditBankAccount = bankAccount.filter(
      (ba) => !ba.pathName.includes('General Reserves'),
    )[0];

    const accountUpdateDto: UpdateAccountDto = {
      creditAmount:
        Number(CreditBankAccount.creditAmount) + Number(totalAmount),
    };
    await this.accountService.update(
      CreditBankAccount.id,
      accountUpdateDto,
      queryRunner,
    );

    for (const detail of createExpenseDto.details) {
      const account = await queryRunner.manager.findOne(Account, {
        where: { id: detail.nominalAccountId, tenant: { id: tenantId } },
      });

      if (!account) {
        throw new NotFoundException(
          `Account with ID ${detail.nominalAccountId} not found`,
        );
      }

      if (account.pathName.includes('General Reserves')) {
        throw new BadRequestException(
          'General Reserves account cannot be used for expenses',
        );
      }

      const accountUpdateDto: UpdateAccountDto = {
        debitAmount: Number(account.debitAmount) + Number(detail.amount),
      };
      await this.accountService.update(
        account.id,
        accountUpdateDto,
        queryRunner,
      );

      await this.entityServiceManager.incrementEntityBalance(
        account.entityType as EntityType,
        account.entityId,
        detail.amount,
      );
    }

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
      relations: ['bank', 'details'],
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return plainToInstance(Expense, expense);
  }

  async update(id: string, data: updateExpenseDto, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId();

    const existingExpense = await queryRunner.manager.findOne(Expense, {
      where: { id, tenant: { id: tenantId } },
      relations: ['bank', 'details'],
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    if (!data.details || !Array.isArray(data.details)) {
      throw new BadRequestException('Expense details are required');
    }

    const newTotalAmount = data.details.reduce(
      (sum, detail) => sum + detail.amount,
      0,
    );

    const isBankChanged =
      data.bankId && data.bankId !== existingExpense.bank.id;

    if (isBankChanged) {
      // 1. Reverse old bank balance
      const oldBankUpdateDto: UpdateBankDto = {
        currentBalance:
          existingExpense.bank.currentBalance + existingExpense.totalAmount,
      };
      await this.bankService.update(
        existingExpense.bank.id,
        oldBankUpdateDto,
        queryRunner,
      );

      // 2. Debit new bank with new total
      const newBank = await queryRunner.manager.findOne(Bank, {
        where: { id: data.bankId, tenant: { id: tenantId } },
      });

      if (!newBank) {
        throw new NotFoundException(`Bank with ID ${data.bankId} not found`);
      }

      const newBankUpdateDto: UpdateBankDto = {
        currentBalance: Number(newBank.currentBalance) - Number(newTotalAmount),
      };
      await this.bankService.update(newBank.id, newBankUpdateDto, queryRunner);

      // Attach new bank to expense
      existingExpense.bank = newBank;
    } else {
      // If bank is the same, update by delta
      const totalDiff = newTotalAmount - existingExpense.totalAmount;
      if (totalDiff !== 0) {
        const bankUpdateDto: UpdateBankDto = {
          currentBalance: existingExpense.bank.currentBalance - totalDiff,
        };
        await this.bankService.update(
          existingExpense.bank.id,
          bankUpdateDto,
          queryRunner,
        );
      }
    }

    // Handle account balance adjustments
    for (const newDetail of data.details) {
      const oldDetail = existingExpense.details.find(
        (detail) => detail.nominalAccount.id === newDetail.nominalAccountId,
      );
      const diff = newDetail.amount - (oldDetail?.amount ?? 0);

      if (diff !== 0) {
        const account = await queryRunner.manager.findOne(Account, {
          where: { id: newDetail.nominalAccountId, tenant: { id: tenantId } },
        });

        if (!account) {
          throw new NotFoundException(
            `Account with ID ${newDetail.nominalAccountId} not found`,
          );
        }

        if (account.pathName.includes('General Reserves')) {
          throw new BadRequestException(
            'General Reserves cannot be debited or credited',
          );
        }

        const accountUpdateDto: UpdateAccountDto = {
          debitAmount: account.debitAmount + diff,
        };
        await this.accountService.update(
          account.id,
          accountUpdateDto,
          queryRunner,
        );

        await this.entityServiceManager.incrementEntityBalance(
          account.entityType as EntityType,
          account.entityId,
          diff,
        );
      }
    }

    // Update the Expense
    existingExpense.totalAmount = newTotalAmount;
    existingExpense.description = data.description;
    await queryRunner.manager.save(Expense, existingExpense);

    return plainToInstance(Expense, existingExpense);
  }

  async delete(id: string, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId();

    // Find existing expense with details
    const existingExpense = await queryRunner.manager.findOne(Expense, {
      where: { id, tenant: { id: tenantId } },
      relations: ['bank', 'details'],
    });

    if (!existingExpense) {
      throw new NotFoundException('Expense not found');
    }

    // Reverse bank balance change
    const bankUpdateDto: UpdateBankDto = {
      currentBalance:
        Number(existingExpense.bank.currentBalance) +
        Number(existingExpense.totalAmount),
    };
    await this.bankService.update(
      existingExpense.bank.id,
      bankUpdateDto,
      queryRunner,
    );

    // Reverse account balance changes
    for (const detail of existingExpense.details) {
      const account = await queryRunner.manager.findOne(Account, {
        where: { id: detail.nominalAccount?.id, tenant: { id: tenantId } },
      });

      if (account) {
        if (account.pathName.includes('General Reserves')) {
          throw new BadRequestException(
            'General Reserves cannot be debited or credited',
          );
        }

        const accountUpdateDto: UpdateAccountDto = {
          debitAmount: account.debitAmount - detail.amount,
        };
        await this.accountService.update(
          account.id,
          accountUpdateDto,
          queryRunner,
        );

        await this.entityServiceManager.incrementEntityBalance(
          account.entityType as EntityType,
          account.entityId,
          -detail.amount,
        );
      }
    }

    // Delete expense details
    await queryRunner.manager.delete(ExpenseDetail, {
      expense: { id: existingExpense.id },
    });

    // Delete expense
    await queryRunner.manager.delete(Expense, { id: existingExpense.id });

    return { message: 'Expense deleted successfully' };
  }
}
