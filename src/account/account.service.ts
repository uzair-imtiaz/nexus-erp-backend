import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  Repository,
  DataSource,
  DeepPartial,
  Brackets,
  QueryRunner,
} from 'typeorm';
import { AccountTree } from './interfaces/account-tree.interface';
import { Account } from './entity/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountType } from './interfaces/account-type.enum';
import { TenantContextService } from 'src/tenant/tenant-context.service';

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

      const account = this.accountRepository.create({
        ...(input as DeepPartial<Account>),
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

      if (account.amount) {
        await this.propagateAmount(
          queryRunner,
          account,
          account.amount,
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
    return this.buildTree(accounts);
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
        .getOneOrFail();
      const oldAmount = account.amount;

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

      const newAmount = account.amount ?? 0;
      const delta = newAmount - oldAmount;

      if (delta !== 0) {
        await this.propagateAmount(queryRunner, account, delta, tenantId);
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

      // Get all descendants including self
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

      // Calculate total amount to subtract
      const totalAmount = descendants.reduce((sum, acc) => sum + acc.amount, 0);

      // Delete descendants
      await queryRunner.manager.remove(descendants);

      // Update ancestors
      const ancestorCodes = account.path.split('/').slice(0, -1);
      if (ancestorCodes.length > 0) {
        await queryRunner.manager
          .createQueryBuilder(Account, 'account')
          .update()
          .set({ amount: () => `"amount" - :totalAmount` })
          .where('account.code IN (:...codes)', { codes: ancestorCodes })
          .andWhere(
            new Brackets((qb) => {
              qb.where('"account"."tenantId" = :tenantId', {
                tenantId,
              }).orWhere('account.system_generated = true');
            }),
          )
          .setParameter('totalAmount', totalAmount)
          .execute();
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
    queryRunner: any,
    account: Account,
    delta: number,
    tenantId: string,
  ) {
    const ancestorCodes = account.path.split('/').slice(0, -1);
    if (ancestorCodes.length > 0) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(Account)
        .set({ amount: () => `amount + ${delta}` })
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
  ): Promise<Account | null> {
    const tenantId = this.tenantContextService.getTenantId();
    return this.accountRepository.findOne({
      where: {
        entityId,
        entityType,
        tenant: { id: tenantId },
      },
    });
  }
}
