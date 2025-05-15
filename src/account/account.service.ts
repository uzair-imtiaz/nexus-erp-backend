import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, DeepPartial, Brackets } from 'typeorm';
import { Account } from './entity/account.entity';
import { AccountType } from './interfaces/account-type.enum';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class AccountService {
  private treeRepository: TreeRepository<Account>;

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    private readonly tenantContextService: TenantContextService,
  ) {
    this.treeRepository =
      this.accountRepository.manager.getTreeRepository(Account);
  }

  /**
   * Recursively update the parent amounts from the given account ID
   * @param accountId ID of the account to start from
   */
  private async updateAmountUpwards(tenantId: string, accountId?: string) {
    if (!accountId) return;

    const children = await this.accountRepository.find({
      where: { parent: { id: accountId }, tenant: { id: tenantId } },
    });
    const total = children.reduce(
      (sum, child) => sum + Number(child.amount),
      0,
    );

    await this.accountRepository.update(accountId, { amount: total });

    // Recursively update further up the tree
    const parent = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['parent'],
    });
    if (parent?.parent?.id) {
      await this.updateAmountUpwards(parent.parent.id);
    }
  }

  /**
   * Create a new Account
   * @param accountData Partial<Account> data to create
   */
  async create(accountData: CreateAccountDto): Promise<Account> {
    const tenantId = this.tenantContextService.getTenantId()!;
    const account = this.accountRepository.create(
      accountData as DeepPartial<Account>,
    );

    // Optional: validate parent exists if parentId provided
    if (accountData.parentId) {
      const parent = await this.accountRepository
        .createQueryBuilder('account')
        .where('account.id = :id', { id: accountData.parentId })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId }).orWhere(
              'account.systemGenerated = :systemGenerated',
              {
                systemGenerated: true,
              },
            );
          }),
        )
        .getOne();
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
      account.parent = parent;
    }

    const savedAccount = await this.accountRepository.save({
      ...account,
      tenant: { id: tenantId },
    });

    // If this is a sub-account (Level 4), propagate amount upwards
    if (accountData.amount !== undefined) {
      await this.updateAmountUpwards(tenantId, savedAccount.parent?.id);
    }

    return savedAccount;
  }

  /**
   * Find all accounts of a specific type without children
   * @param type AccountType enum value
   */
  async findByType(type: AccountType): Promise<Account[]> {
    const tenantId = this.tenantContextService.getTenantId();

    const accounts = await this.accountRepository
      .createQueryBuilder('account')
      .where('account.type = :type', { type })
      .andWhere(
        new Brackets((qb) => {
          qb.where('account.tenantId = :tenantId', { tenantId }).orWhere(
            'account.systemGenerated = :systemGenerated',
            {
              systemGenerated: true,
            },
          );
        }),
      )
      .orderBy('account.code', 'ASC')
      .getMany();

    return accounts;
  }

  /**
   * Find all accounts with full nested children hierarchy
   */
  async findAll(): Promise<Account[]> {
    return this.treeRepository.findTrees();
  }

  /**
   * Update an account by ID
   * @param id Account ID
   * @param updateData Partial<Account> data to update
   */
  async update(id: string, updateData: UpdateAccountDto): Promise<Account> {
    const account = await this.accountRepository.findOneBy({ id });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // If updating parent, validate it exists and prevent circular reference
    if (updateData.parentId) {
      if (updateData.parentId === id) {
        throw new Error('Account cannot be parent of itself');
      }
      const parent = await this.accountRepository.findOneBy({
        id: updateData.parentId,
      });
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
      account.parent = parent;
    }

    if (updateData.amount && updateData.amount !== account?.amount) {
      account.amount = updateData.amount;
      await this.updateAmountUpwards(account.parent?.id);
    }
    this.accountRepository.merge(account, updateData);
    return this.accountRepository.save(account);
  }

  /**
   * Delete an account by ID
   * @param id Account ID
   */
  async delete(id: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['parent'], // load parent to update amounts after deletion
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const descendants = await this.treeRepository.findDescendants(account);
    const idsToDelete = descendants.map((acc) => acc.id);

    // Delete all descendants in one query
    await this.accountRepository.delete(idsToDelete);

    // After deletion, update amounts upwards starting from the deleted node's parent
    if (account.parent?.id) {
      await this.updateAmountUpwards(account.parent.id);
    }
  }
}
