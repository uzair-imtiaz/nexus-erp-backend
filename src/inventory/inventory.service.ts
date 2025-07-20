import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
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
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { JournalService } from 'src/journal/journal.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private readonly tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => JournalService))
    private readonly journalService: JournalService,
  ) {}

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingInventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.code = :code', { code: createInventoryDto.code })
        .andWhere('inventory.tenant.id = :tenantId', { tenantId })
        .getOne();

      if (existingInventory) {
        throw new ConflictException('Inventory code already exists');
      }
      if (!createInventoryDto.multiUnits) {
        createInventoryDto.multiUnits = {};
      }
      createInventoryDto.multiUnits[createInventoryDto.baseUnit] = 1;
      const inventory = this.inventoryRepository.create({
        ...createInventoryDto,
        amount: createInventoryDto.baseRate * createInventoryDto.quantity,
        tenant: { id: tenantId },
      });

      const savedInventory = await queryRunner.manager.save(
        Inventory,
        inventory,
      );

      const instance = plainToInstance(Inventory, savedInventory);

      let account = await this.accountService.findOne(
        {
          name: 'Customer Openings',
        },
        ['id'],
      );
      // Create accounts with zero opening balances
      const creditAccount: CreateAccountDto = {
        name: instance.name,
        code: `${instance.code}-cr`,
        type: AccountType.SUB_ACCOUNT,
        parentId: Number(account?.id),
        entityId: instance.id,
        entityType: EntityType.INVENTORY,
        creditAmount: 0,
      };

      account = await this.accountService.findOne(
        {
          name: 'Stock In Hand',
        },
        ['id'],
      );
      const debitAccount: CreateAccountDto = {
        name: instance.name,
        code: `${instance.code}-dr`,
        type: AccountType.SUB_ACCOUNT,
        parentId: Number(account?.id),
        entityId: instance.id,
        entityType: EntityType.INVENTORY,
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
          ref: `INV-OPEN-${instance.code}`,
          date: new Date(),
          description: `Opening balance for inventory ${instance.name}`,
          details: [
            {
              nominalAccountId: createdDebitAccount.id,
              debit: instance.amount,
              credit: 0,
            },
            {
              nominalAccountId: createdCreditAccount.id,
              debit: 0,
              credit: instance.amount,
            },
          ],
        },
        queryRunner,
      );

      await queryRunner.commitTransaction();
      return instance;
    } catch (error: any) {
      if (queryRunner) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (queryRunner) {
        await queryRunner.release();
      }
    }
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Inventory>> {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request headers');
    }

    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.tenant', 'tenant')
      .where('tenant.id = :tenantId', { tenantId });

    const { page, limit, ...filterFields } = filters;
    const ALLOWED_FILTERS = ['name', 'category'];

    Object.entries(filterFields).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`inventory.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Inventory, item);
      return instance;
    });
    return paginated;
  }

  async findOne(id: string): Promise<Inventory> {
    const tenantId = this.tenantContextService.getTenantId();
    const inventory = await this.inventoryRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }

    return plainToInstance(Inventory, inventory);
  }

  async delete(id: string) {
    const tenantId = this.tenantContextService.getTenantId();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inventory = await queryRunner.manager.findOne(Inventory, {
        where: { id, tenant: { id: tenantId } },
      });
      if (!inventory) {
        throw new NotFoundException(`Inventory with ID ${id} not found`);
      }

      const accounts = await this.accountService.findByEntityIdAndType(
        id,
        'inventory',
      );

      if (!accounts?.length) {
        throw new NotFoundException(
          `Accounts not found for inventory with ID ${id}`,
        );
      }
      // Find debit and credit accounts
      const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
      const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
      if (!debitAccount || !creditAccount) {
        throw new NotFoundException(
          'Debit or Credit account not found for inventory',
        );
      }
      // Create reversal journal entry for the remaining inventory value
      const amount = Number(inventory.amount);
      if (amount !== 0) {
        await this.journalService.create(
          {
            ref: `INV-DEL-${inventory.code}-${Date.now()}`,
            date: new Date(),
            description: `Inventory deletion for ${inventory.name}`,
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

      await queryRunner.manager.softDelete(Inventory, id);

      await queryRunner.commitTransaction();
      return;
    } catch (error: any) {
      if (
        queryRunner &&
        typeof queryRunner.rollbackTransaction === 'function'
      ) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (queryRunner && typeof queryRunner.release === 'function') {
        await queryRunner.release();
      }
    }
  }

  // TODO: Need to refactor so that there are two functions with single responsibility => 1 with journal and other without it
  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    queryRunner?: QueryRunner,
    shouldCreateJournal = true,
  ) {
    // Remove unused accountToUpdate param
    let hasOwnQueryRunner = false;
    const tenantId = this.tenantContextService.getTenantId();

    if (!queryRunner) {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      hasOwnQueryRunner = true;
    }

    try {
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.id = :id', { id })
        .andWhere('inventory.tenant.id = :tenantId', { tenantId })
        .getOne();

      const oldAmount = Number(inventory?.amount);

      if (!inventory) {
        throw new NotFoundException(`Inventory with ID ${id} not found`);
      }

      updateInventoryDto.amount =
        updateInventoryDto.amount ??
        updateInventoryDto.baseRate! * updateInventoryDto.quantity!;

      Object.assign(inventory, updateInventoryDto);
      const updatedInventory = await queryRunner.manager.save(inventory);
      const instance = plainToInstance(Inventory, updatedInventory);

      // Find related accounts
      const accounts = await this.accountService.findByEntityIdAndType(
        id,
        'inventory',
      );
      if (!accounts?.length) {
        throw new NotFoundException(
          `Accounts not found for inventory with ID ${id}`,
        );
      }
      // Find debit and credit accounts
      const debitAccount = accounts.find((a) => a.code.endsWith('-dr'));
      const creditAccount = accounts.find((a) => a.code.endsWith('-cr'));
      if (!debitAccount || !creditAccount) {
        throw new NotFoundException(
          'Debit or Credit account not found for inventory',
        );
      }

      // Calculate value difference
      const newAmount = Number(instance.amount);
      const diff = newAmount - oldAmount;
      if (diff !== 0 && shouldCreateJournal) {
        // Create adjustment journal entry
        await this.journalService.create(
          {
            ref: `INV-ADJ-${instance.code}-${Date.now()}`,
            date: new Date(),
            description: `Inventory adjustment for ${instance.name}`,
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
      if (hasOwnQueryRunner) await queryRunner.commitTransaction();
      return instance;
    } catch (error: any) {
      if (hasOwnQueryRunner) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (hasOwnQueryRunner) {
        await queryRunner.release();
      }
    }
  }

  async incrementBalance(
    id: string,
    amount: number,
    column: string,
    queryRunner?: QueryRunner,
  ) {
    if (queryRunner) {
      await queryRunner.manager.increment(Inventory, { id }, column, amount);
    } else {
      await this.inventoryRepository.increment({ id }, column, amount);
    }
  }
}
