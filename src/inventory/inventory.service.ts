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
import { Repository } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { DataSource } from 'typeorm';

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
        tenant: { id: tenantId },
      });

      const savedInventory = await queryRunner.manager.save(
        Inventory,
        inventory,
      );

      const instance = plainToInstance(Inventory, savedInventory);

      const account: CreateAccountDto = {
        name: instance.name,
        code: instance.code,
        type: AccountType.SUB_ACCOUNT,
        parentId: instance.parentId,
        entityId: instance.id,
        entityType: 'inventory',
        amount: instance.amount,
      };

      await this.accountService.create(account, queryRunner);

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

      const account = await this.accountService.findByEntityIdAndType(
        id,
        'inventory',
      );
      if (account) {
        await this.accountService.delete(account.id, queryRunner);
      }

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
      // Find the inventory
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.id = :id', { id })
        .andWhere('inventory.tenant.id = :tenantId', { tenantId })
        .getOne();

      if (!inventory) {
        throw new NotFoundException(`Inventory with ID ${id} not found`);
      }

      // Update inventory
      Object.assign(inventory, updateInventoryDto);
      const updatedInventory = await queryRunner.manager.save(inventory);
      const instance = plainToInstance(Inventory, updatedInventory);

      // Find and update the corresponding account
      const account = await this.accountService.findByEntityIdAndType(
        id,
        'inventory',
      );

      if (account) {
        const updateAccountDto = {
          name: instance.name,
          code: instance.code,
          parentId: instance.parentId,
          amount: instance.amount,
        };
        await this.accountService.update(
          account.id,
          updateAccountDto,
          queryRunner,
        );
      }

      await queryRunner.commitTransaction();
      return instance;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
