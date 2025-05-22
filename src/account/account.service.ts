import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Brackets, DataSource, In, QueryRunner, Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entity/account.entity';
import { AccountTree } from './interfaces/account-tree.interface';
import { AccountType } from './interfaces/account-type.enum';
import { accountColumnNameMap } from './constants/account.constants';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private dataSource: DataSource,
    private tenantContextService: TenantContextService,
  ) {}

  async create(
    input: CreateAccountDto,
    queryRunner?: QueryRunner,
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
      const existingAccount = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.code = :code', { code: input.code })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenant = :tenantId', { tenantId }).orWhere(
              'account.system_generated = true',
            );
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

      if (input.parentId) {
        const parent = await queryRunner.manager
          .createQueryBuilder(Account, 'account')
          .where('account.id = :id', { id: input.parentId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('account.tenant = :tenantId', { tenantId }).orWhere(
                'account.system_generated = true',
              );
            }),
          )
          .getOneOrFail();
        account.parent = parent;
      }
      await queryRunner.manager.save(account);

      if (account.debitAmount) {
        await this.propagateAmount(
          queryRunner,
          account,
          { type: 'creditAmount' as const, amount: account.creditAmount },
          tenantId,
        );
      }

      if (account.creditAmount) {
        await this.propagateAmount(
          queryRunner,
          account,
          { type: 'debitAmount' as const, amount: account.debitAmount },
          tenantId,
        );
      }

      if (ownQueryRunner) await queryRunner.commitTransaction();
      return account;
    } catch (error) {
      if (ownQueryRunner) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      if (ownQueryRunner) await queryRunner.release();
    }
  }

  async findByType(type: AccountType): Promise<Account[]> {
    const tenantId = this.tenantContextService.getTenantId();
    const accounts = await this.accountRepository
      .createQueryBuilder('account')
      .where('account.type = :type', { type })
      .andWhere(
        new Brackets((qb) => {
          qb.where('account.tenant = :tenantId', { tenantId }).orWhere(
            'account.system_generated = true',
          );
        }),
      )
      .getMany();
    return accounts;
  }

  async findAll(): Promise<AccountTree[]> {
    const tenantId = this.tenantContextService.getTenantId()!;
    const accounts = await this.accountRepository.find({
      where: [{ tenant: { id: tenantId } }, { systemGenerated: true }],
      order: { path: 'ASC' },
    });
    const instance = plainToInstance(Account, accounts);
    return this.buildTree(instance);
  }

  // Update Account with Amount Propagation
  async update(
    id: string,
    input: UpdateAccountDto,
    queryRunner?: QueryRunner,
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
      const account = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.id = :id', { id })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId }).orWhere(
              'account.system_generated = true',
            );
          }),
        )
        .getOne();

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      const oldCredit = account.creditAmount ?? 0;
      const oldDebit = account.debitAmount ?? 0;

      if (input.parentId) {
        const parent = await queryRunner.manager
          .createQueryBuilder(Account, 'account')
          .where('account.id = :id', { id: input.parentId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('account.tenant = :tenantId', { tenantId }).orWhere(
                'account.system_generated = true',
              );
            }),
          )
          .getOneOrFail();
        account.parent = parent;
      }

      Object.assign(account, input);
      await queryRunner.manager.save(account);

      const newCredit = account.creditAmount ?? 0;
      const newDebit = account.debitAmount ?? 0;

      const creditDelta = newCredit - oldCredit;
      const debitDelta = newDebit - oldDebit;

      if (creditDelta !== 0) {
        await this.propagateAmount(
          queryRunner,
          account,
          { type: 'creditAmount', amount: creditDelta },
          tenantId,
        );
      }

      if (debitDelta !== 0) {
        await this.propagateAmount(
          queryRunner,
          account,
          { type: 'debitAmount', amount: debitDelta },
          tenantId,
        );
      }

      if (ownQueryRunner) await queryRunner.commitTransaction();
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
            qb.where('account.tenantId = :tenantId', { tenantId }).orWhere(
              'account.system_generated = true',
            );
          }),
        )
        .getOneOrFail();

      const descendants = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.path LIKE :path', { path: `${account.path}%` })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId }).orWhere(
              'account.system_generated = true',
            );
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
            account,
            { type: 'creditAmount', amount: -totalCredit },
            tenantId,
          );
        }

        if (totalDebit !== 0) {
          await this.propagateAmount(
            queryRunner,
            account,
            { type: 'debitAmount', amount: -totalDebit },
            tenantId,
          );
        }
      }
      if (ownQueryRunner) await queryRunner.commitTransaction();
    } catch (error) {
      if (ownQueryRunner) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      if (ownQueryRunner) await queryRunner.release();
    }
  }

  // Helper: Propagate amount changes to ancestors
  private async propagateAmount(
    queryRunner: QueryRunner,
    account: Account,
    amountData: { type: 'debitAmount' | 'creditAmount'; amount: number },
    tenantId: string,
  ) {
    try {
      const ancestorCodes = account.path.split('/').slice(0, -1);
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
              qb.where('tenant = :tenantId', { tenantId }).orWhere(
                'system_generated = true',
              );
            }),
          )
          .execute();
      }
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
    return this.accountRepository.find({
      where: {
        entityId,
        entityType,
        tenant: { id: tenantId },
      },
    });
  }
}
