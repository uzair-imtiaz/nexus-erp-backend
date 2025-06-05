import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { DataSource, Repository } from 'typeorm';
import { PARENT_ACCOUNT_IDS } from './contsants/inventory.constants';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private readonly tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
    private readonly dataSource: DataSource,
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

      const creditAccount: CreateAccountDto = {
        name: instance.name,
        code: `${instance.code}-cr`,
        type: AccountType.SUB_ACCOUNT,
        parentId: PARENT_ACCOUNT_IDS.CREDIT,
        entityId: instance.id,
        entityType: EntityType.INVENTORY,
        creditAmount: instance.amount,
      };

      const debitAccount: CreateAccountDto = {
        name: instance.name,
        code: `${instance.code}-dr`,
        type: AccountType.SUB_ACCOUNT,
        parentId: PARENT_ACCOUNT_IDS.DEBIT,
        entityId: instance.id,
        entityType: EntityType.INVENTORY,
        debitAmount: instance.amount,
      };

      await this.accountService.create(creditAccount, queryRunner);
      await this.accountService.create(debitAccount, queryRunner);

      await queryRunner.commitTransaction();
      return instance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
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
      const inventory = await this.inventoryRepository.findOneBy({
        id,
        tenant: { id: tenantId },
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
      await Promise.all(
        accounts.map((account) =>
          this.accountService.delete(account.id, queryRunner),
        ),
      );

      await this.inventoryRepository.delete(id);

      await queryRunner.commitTransaction();
      return;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateInventoryDto: UpdateInventoryDto) {
    const tenantId = this.tenantContextService.getTenantId();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.id = :id', { id })
        .andWhere('inventory.tenant.id = :tenantId', { tenantId })
        .getOne();

      if (!inventory) {
        throw new NotFoundException(`Inventory with ID ${id} not found`);
      }

      updateInventoryDto.amount =
        updateInventoryDto.amount ??
        updateInventoryDto.baseRate! * updateInventoryDto.quantity!;

      Object.assign(inventory, updateInventoryDto);
      const updatedInventory = await queryRunner.manager.save(inventory);
      const instance = plainToInstance(Inventory, updatedInventory);

      const accounts = await this.accountService.findByEntityIdAndType(
        id,
        'inventory',
      );

      if (!accounts?.length) {
        throw new NotFoundException(
          `Accounts not found for inventory with ID ${id}`,
        );
      }

      await Promise.all(
        accounts.map((account) => {
          const updateData: UpdateAccountDto = {
            ...account,
            name: instance.name,
            entityType: EntityType.INVENTORY,
          };

          // Determine if this is a debit or credit account
          if (Number(account.debitAmount)) {
            updateData['debitAmount'] = instance.amount;
          } else if (Number(account.creditAmount)) {
            updateData['creditAmount'] = instance.amount;
          }
          return this.accountService.update(
            account.id,
            updateData,
            queryRunner,
          );
        }),
      );

      await queryRunner.commitTransaction();
      return instance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async incrementBalance(id: string, amount: number) {
    await this.inventoryRepository.increment({ id }, 'amount', amount);
  }
}
