import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Bank } from './entity/bank.entity';
import { UpdateBankDto } from './dto/update-bank.dto';
import { CreateBankDto } from './dto/create-bank.dto';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { plainToInstance } from 'class-transformer';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import {
  ALLOWED_FILTERS,
  PARENT_ACCOUNT_IDS,
} from './constants/bank.constants';
import { AccountService } from 'src/account/account.service';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { EntityType } from 'src/common/enums/entity-type.enum';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Bank) private bankRepository: Repository<Bank>,
    private readonly tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
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

    Object.assign(bank, updateBankDto);
    const updatedBank = await queryRunner.manager.save(Bank, bank);

    const accounts = await this.accountService.findByEntityIdAndType(
      id,
      'bank',
    );
    const instance = plainToInstance(Bank, updatedBank);

    if (!accounts?.length) {
      throw new NotFoundException(`Accounts not found for bank with ID ${id}`);
    }

    await Promise.all(
      accounts.map((account) => {
        const { code: _, ...rest } = account;
        const updateData: UpdateAccountDto = {
          ...rest,
          entityType: EntityType.BANK,
          name: instance.name,
        };
        if (Number(account.debitAmount)) {
          updateData['debitAmount'] = instance.currentBalance;
        } else if (Number(account.creditAmount)) {
          updateData['creditAmount'] = instance.currentBalance;
        }
        return this.accountService.update(account.id, updateData, queryRunner);
      }),
    );
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
    await Promise.all(
      accounts.map((account) =>
        this.accountService.delete(account.id, queryRunner),
      ),
    );

    await queryRunner.manager.delete(Bank, id);
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

    const creditAccount: CreateAccountDto = {
      name: instance.name,
      code: `${instance.code}-cr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: PARENT_ACCOUNT_IDS.CREDIT,
      entityId: instance.id,
      entityType: EntityType.BANK,
      creditAmount: instance.currentBalance,
    };

    const debitAccount: CreateAccountDto = {
      name: instance.name,
      code: `${instance.code}-dr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: PARENT_ACCOUNT_IDS.DEBIT,
      entityId: instance.id,
      entityType: EntityType.BANK,
      debitAmount: instance.currentBalance,
    };

    await this.accountService.create(creditAccount, queryRunner);
    await this.accountService.create(debitAccount, queryRunner);

    return instance;
  }

  async incrementBalance(id: string, amount: number, column: string) {
    await this.bankRepository.increment({ id }, column, amount);
  }
}
