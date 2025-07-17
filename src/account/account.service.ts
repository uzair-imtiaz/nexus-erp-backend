import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import {
  Brackets,
  DataSource,
  FindOptionsWhere,
  In,
  Like,
  QueryRunner,
  Repository,
} from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entity/account.entity';
import { AccountTree } from './interfaces/account-tree.interface';
import { AccountType } from './interfaces/account-type.enum';
import { accountColumnNameMap } from './constants/account.constants';
import { plainToInstance } from 'class-transformer';
import { RedisService } from 'src/redis/redis.service';
import { getKeyForEntityFromAccountForRedis } from 'src/common/utils';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { Tenant } from 'src/tenant/entity/tenant.entity';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private dataSource: DataSource,
    private tenantContextService: TenantContextService,
    private readonly redisService: RedisService,
  ) {}

  async create(
    input: CreateAccountDto,
    queryRunner?: QueryRunner,
  ): Promise<Account> {
    let ownQueryRunner = false;
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant not found');
    }

    if (!queryRunner) {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      ownQueryRunner = true;
    }

    try {
      const existingAccount = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.code = :code', { code: input.code })
        .leftJoinAndSelect('account.parent', 'parent')
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenant = :tenantId', { tenantId });
            // .orWhere(
            //   'account.system_generated = true',
            // );
          }),
        )
        .getOne();
      if (existingAccount) {
        throw new ConflictException('Account code already exists');
      }

      const account = queryRunner.manager.create(Account, {
        ...input,
        tenant: { id: tenantId },
      });

      if (input.parentId && input.parentId !== Number(account.parent?.id)) {
        const parent = await queryRunner.manager
          .createQueryBuilder(Account, 'account')
          .where('account.id = :id', { id: input.parentId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('account.tenant = :tenantId', { tenantId });
              // .orWhere(
              //   'account.system_generated = true',
              // );
            }),
          )
          .getOneOrFail();
        account.parent = parent;
      }
      await queryRunner.manager.save(account);

      if (account.debitAmount) {
        await this.propagateAmount(
          queryRunner,
          account.path,
          { type: 'creditAmount' as const, amount: account.creditAmount },
          tenantId,
        );
      }

      if (account.creditAmount) {
        await this.propagateAmount(
          queryRunner,
          account.path,
          { type: 'debitAmount' as const, amount: account.debitAmount },
          tenantId,
        );
      }
      await this.redisService.setHash(`account:${account.id}`, account);
      const key = getKeyForEntityFromAccountForRedis(account, tenantId);

      await this.redisService.setHash(key, account);

      if (ownQueryRunner) await queryRunner.commitTransaction();
      return account;
    } catch (error) {
      if (ownQueryRunner) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      if (ownQueryRunner) await queryRunner.release();
    }
  }

  async findByType(
    type: AccountType,
    filters: Record<string, any>,
  ): Promise<Paginated<Account>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.accountRepository
      .createQueryBuilder('account')
      .where('account.type = :type', { type })
      .andWhere(
        new Brackets((qb) => {
          qb.where('account.tenant = :tenantId', { tenantId });
          // .orWhere(
          //   'account.system_generated = true',
          // );
        }),
      );

    const { page, limit } = filters;
    const ALLOWED_FILTERS = ['name'];

    Object.entries(filters).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`account.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    const paginated = await paginate<Account>(queryBuilder, page, limit);
    return paginated;
  }

  async findOne<T extends keyof Account>(
    where: FindOptionsWhere<Account>,
    select?: T[],
    relations?: string[],
  ): Promise<Account | null> {
    return this.accountRepository.findOne({
      where,
      select,
      relations,
    });
  }

  async findAll(): Promise<AccountTree[]> {
    const tenantId = this.tenantContextService.getTenantId()!;
    const accounts = await this.accountRepository.find({
      where: [{ tenant: { id: tenantId } }],
      relations: ['tenant'],
      order: { path: 'ASC' },
    });
    accounts
      .filter((account) => account.tenant)
      .forEach((account) => {
        const key = getKeyForEntityFromAccountForRedis(account, tenantId);

        this.redisService.setHash(key, account);
      });

    accounts.map((account) => {
      this.redisService.setHash(`account:${account.id}`, account);
    });

    const instance = plainToInstance(Account, accounts);
    return this.buildTree(instance);
  }

  // Update Account with Amount Propagation
  async update(
    id: string,
    input: UpdateAccountDto,
    queryRunner?: QueryRunner,
    increment: boolean = false,
  ): Promise<Account> {
    let ownQueryRunner = false;
    const tenantId = this.tenantContextService.getTenantId()!;

    if (!queryRunner) {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      ownQueryRunner = true;
    }

    try {
      const account = await this.redisService.getHash<Account>(`account:${id}`);

      if (!account) throw new NotFoundException(`Account:${id} not found`);

      // Parse old credit and debit amounts, defaulting to 0 if undefined
      const oldCredit = Number(account.creditAmount ?? 0);
      const oldDebit = Number(account.debitAmount ?? 0);

      // If parentId is provided, update the parent relationship in DB
      if (input.parentId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(Account)
          .set({ parent: { id: input.parentId } })
          .where('id = :id', { id })
          .andWhere(
            new Brackets((qb) => {
              qb.where('tenantId = :tenantId', { tenantId });
              // .orWhere(
              //   'system_generated = true',
              // );
            }),
          )
          .execute();
      }

      // Separate parentId from other fields to update
      const { parentId, ...fieldsToUpdate } = input;

      // Determine the updated credit and debit amounts based on increment flag
      let updatedCredit = oldCredit;
      let updatedDebit = oldDebit;

      if (fieldsToUpdate.creditAmount !== undefined) {
        updatedCredit = increment
          ? oldCredit + Number(fieldsToUpdate.creditAmount)
          : Number(fieldsToUpdate.creditAmount);
      }

      if (fieldsToUpdate.debitAmount !== undefined) {
        updatedDebit = increment
          ? oldDebit + Number(fieldsToUpdate.debitAmount)
          : Number(fieldsToUpdate.debitAmount);
      }

      // Update the Account entity in the database with the new values
      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({
          ...fieldsToUpdate,
          creditAmount: updatedCredit,
          debitAmount: updatedDebit,
        })
        .where('id = :id', { id })
        .andWhere(
          new Brackets((qb) => {
            qb.where('tenantId = :tenantId', { tenantId });
            // .orWhere(
            //   'system_generated = true',
            // );
          }),
        )
        .execute();

      // Calculate the differences (deltas) for propagation
      const creditDelta = updatedCredit - oldCredit;
      const debitDelta = updatedDebit - oldDebit;

      const path = account.path;

      if (creditDelta !== 0) {
        await this.propagateAmount(
          queryRunner,
          path,
          { type: 'creditAmount', amount: creditDelta },
          tenantId,
        );
      }

      if (debitDelta !== 0) {
        await this.propagateAmount(
          queryRunner,
          path,
          { type: 'debitAmount', amount: debitDelta },
          tenantId,
        );
      }

      await this.redisService.setMHash(`account:${id}`, {
        ...fieldsToUpdate,
        creditAmount: updatedCredit,
        debitAmount: updatedDebit,
      });

      const key = getKeyForEntityFromAccountForRedis(account, tenantId);
      await this.redisService.setMHash(key, {
        ...fieldsToUpdate,
        creditAmount: updatedCredit,
        debitAmount: updatedDebit,
      });

      if (ownQueryRunner) await queryRunner.commitTransaction();
      Object.assign(account, fieldsToUpdate);
      return account;
    } catch (error) {
      if (ownQueryRunner) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      if (ownQueryRunner) await queryRunner.release();
    }
  }

  // Delete Account and Descendants with Amount Reversal
  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    let ownQueryRunner = false;
    const tenantId = this.tenantContextService.getTenantId()!;

    if (!queryRunner) {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      ownQueryRunner = true;
    }

    try {
      const account = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.id = :id', { id })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId });
            // .orWhere(
            //   'account.system_generated = true',
            // );
          }),
        )
        .getOneOrFail();

      const descendants = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.path LIKE :path', { path: `${account.path}%` })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId });
            // .orWhere(
            //   'account.system_generated = true',
            // );
          }),
        )
        .getMany();

      // Aggregate amounts to subtract
      const totalCredit = descendants.reduce(
        (sum, acc) => sum + (acc.creditAmount ?? 0),
        0,
      );
      const totalDebit = descendants.reduce(
        (sum, acc) => sum + (acc.debitAmount ?? 0),
        0,
      );
      const totalAmount = descendants.reduce((sum, acc) => sum + acc.amount, 0);

      // Delete descendants
      await queryRunner.manager.remove(descendants);

      const ancestorCodes = account.path.split('/').slice(0, -1);

      if (ancestorCodes.length > 0) {
        // Propagate amounts to ancestors
        if (totalCredit !== 0) {
          await this.propagateAmount(
            queryRunner,
            account.path,
            { type: 'creditAmount', amount: -totalCredit },
            tenantId,
          );
        }

        if (totalDebit !== 0) {
          await this.propagateAmount(
            queryRunner,
            account.path,
            { type: 'debitAmount', amount: -totalDebit },
            tenantId,
          );
        }
      }
      await this.redisService.deleteHash(`account:${id}`);
      const key = getKeyForEntityFromAccountForRedis(account, tenantId);

      await this.redisService.deleteHash(key);
      if (ownQueryRunner) await queryRunner.commitTransaction();
    } catch (error) {
      if (ownQueryRunner) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      if (ownQueryRunner) await queryRunner.release();
    }
  }

  async credit(id: string, amount: number, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const repo = queryRunner.manager.getRepository(Account);
    await repo.increment({ id }, 'creditAmount', amount);
    const account = await this.redisService.getHash<Account>(`account:${id}`);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    await this.propagateAmount(
      queryRunner,
      account.path,
      {
        type: 'creditAmount',
        amount,
      },
      tenantId,
    );
    return account;
  }

  async debit(id: string, amount: number, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const repo = queryRunner.manager.getRepository(Account);
    await repo.increment({ id }, 'debitAmount', amount);
    const account = await this.redisService.getHash<Account>(`account:${id}`);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    await this.propagateAmount(
      queryRunner,
      account.path,
      {
        type: 'debitAmount',
        amount,
      },
      tenantId,
    );
    return account;
  }

  // Helper: Propagate amount changes to ancestors
  private async propagateAmount(
    queryRunner: QueryRunner,
    path: string,
    amountData: { type: 'debitAmount' | 'creditAmount'; amount: number },
    tenantId: string,
  ) {
    try {
      const ancestorCodes = String(path).split('/')?.slice(0, -1);
      const { type, amount } = amountData;
      if (ancestorCodes.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(Account)
          .set({
            [type]: () => `"${accountColumnNameMap[type]}" + ${amount}`,
          })
          .where({ code: In(ancestorCodes) })
          .andWhere(
            new Brackets((qb) => {
              qb.where('tenant = :tenantId', { tenantId });
              // .orWhere(
              //   'system_generated = true',
              // );
            }),
          )
          .execute();
      }
    } catch (error) {
      throw error;
    }
  }

  private async propagateAmountInDirection(
    queryRunner: QueryRunner,
    account: Account,
    amountData: { type: 'debitAmount' | 'creditAmount'; amount: number },
    direction: 'up' | 'down',
    tenantId: string,
  ) {
    try {
      const { type, amount } = amountData;
      if (amount === 0) return;

      const qb = queryRunner.manager.createQueryBuilder().update(Account);

      qb.set({
        [type]: () => `"${accountColumnNameMap[type]}" + ${amount}`,
      });

      if (direction === 'up') {
        // If no ancestors, skip propagation
        const ancestorCodes = account.path.split('/').slice(0, -1);
        if (ancestorCodes.length === 0) return;

        qb.where({ code: In(ancestorCodes) });
      } else if (direction === 'down') {
        // If no children/descendants, skip propagation
        const childCount = await queryRunner.manager.count(Account, {
          where: {
            path: Like(`${account.path}/%`),
            tenant: { id: tenantId },
          },
        });
        if (childCount === 0) return;

        qb.where('path LIKE :path', { path: `${account.path}/%` });
      }

      qb.andWhere(
        new Brackets((qb) => {
          qb.where('tenant = :tenantId', { tenantId });
          // .orWhere(
          //   'system_generated = true',
          // );
        }),
      );

      await qb.execute();
    } catch (error) {
      throw error;
    }
  }

  private buildTree(accounts: Account[]): AccountTree[] {
    const map = new Map<string, AccountTree>();
    const roots: AccountTree[] = [];

    accounts.forEach((account) => {
      map.set(account.code, {
        ...account,
        children: [],
        parent_id: account?.parent?.id,
      });
    });

    accounts.forEach((account) => {
      const pathParts = account.path.split('/');

      if (pathParts.length === 1) {
        // Root node
        roots.push(map.get(account.code)!);
      } else {
        const parentCode = pathParts[pathParts.length - 2];
        const parent = map.get(parentCode);
        if (parent) {
          parent.children.push(map.get(account.code)!);
        }
      }
    });

    return roots;
  }

  async findByEntityIdAndType(
    entityId: string,
    entityType: string,
  ): Promise<Account[] | null> {
    const tenantId = this.tenantContextService.getTenantId();
    const x = this.accountRepository.find({
      where: {
        entityId,
        entityType,
        tenant: { id: tenantId },
      },
    });
    return x;
  }

  /**
   * Get accounts by type under a specific top-level account (e.g., Equity, Assets, etc.)
   * @param parentName The name of the top-level account (e.g., 'Equity', 'Assets', etc.)
   * @param type The account type to filter by (e.g., ACCOUNT_TYPE, ACCOUNT, etc.)
   * @param filters Additional filters (e.g., name, pagination)
   */
  async findByTypeUnderTopLevel(
    parentName: string,
    type: AccountType,
    filters: Record<string, any>,
  ): Promise<Paginated<Account>> {
    const tenantId = this.tenantContextService.getTenantId();
    // Find the top-level account (ACCOUNT_GROUP) by name
    const parent = await this.accountRepository.findOne({
      where: {
        name: parentName,
      },
    });
    if (!parent) {
      throw new NotFoundException(
        `Top-level account '${parentName}' not found`,
      );
    }
    // Find direct children of this parent, filtered by type
    const queryBuilder = this.accountRepository
      .createQueryBuilder('account')
      .where('account.path LIKE :path', { path: `${parent.path}/%` })
      .andWhere('account.type = :type', { type })
      .andWhere(
        new Brackets((qb) => {
          qb.where('account.tenant = :tenantId', { tenantId });
          // .orWhere(
          //   'account.system_generated = true',
          // );
        }),
      );
    const { page, limit, ...filterFields } = filters;
    const ALLOWED_FILTERS = ['name'];
    Object.entries(filterFields).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`account.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });
    const paginated = await paginate<Account>(queryBuilder, page, limit);
    return paginated;
  }

  async copySystemAccountsForTenant(newTenant: Tenant): Promise<void> {
    const systemAccounts = await this.accountRepository.find({
      where: { systemGenerated: true },
      order: { path: 'ASC' }, // Ensure parent accounts come before children
      relations: ['parent'], // Needed to access sysAcc.parent.id
    });

    const oldToNewAccountMap = new Map<string, Account>();

    await this.dataSource.transaction(async (manager) => {
      for (const sysAcc of systemAccounts) {
        const newAccount = manager.getRepository(Account).create({
          name: sysAcc.name,
          type: sysAcc.type,
          code: sysAcc.code,
          entityType: sysAcc.entityType,
          entityId: sysAcc.entityId,
          systemGenerated: false,
          path: sysAcc.path,
          pathName: sysAcc.pathName,
          tenant: newTenant,
          debitAmount: 0,
          creditAmount: 0,
        });

        // Set parent if already saved
        if (sysAcc.parent) {
          const newParent = oldToNewAccountMap.get(sysAcc.parent.id);
          if (newParent) {
            newAccount.parent = newParent;
          }
        }

        const saved = await manager.getRepository(Account).save(newAccount);
        oldToNewAccountMap.set(sysAcc.id, saved);
      }
    });
  }
}
