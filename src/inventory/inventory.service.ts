import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../account/entity/account.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    const tenantId = this.tenantContextService.getTenantId();
    const inventory = new Inventory();
    inventory.name = createInventoryDto.name;
    inventory.quantity = createInventoryDto.quantity;
    inventory.baseRate = createInventoryDto.baseRate;
    inventory.category = createInventoryDto.category;
    inventory.baseUnit = createInventoryDto.baseUnit;

    if (createInventoryDto.multiUnits) {
      inventory.multiUnits = createInventoryDto.multiUnits;
    }

    const latest = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.tenant = :tenantId', { tenantId })
      .orderBy('inventory.id', 'DESC')
      .getOne();

    const nextId = latest ? parseInt(latest.id.replace('ITEM-', '')) + 1 : 1;
    const id = `ITEM-${nextId.toString().padStart(5, '0')}`;
    inventory.id = id;

    return await this.inventoryRepository.save(inventory);
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Inventory>> {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request headers');
    }

    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.accountLevel1', 'accountLevel1')
      .leftJoinAndSelect('inventory.accountLevel2', 'accountLevel2')
      .where('inventory.tenant.id = :tenantId', { tenantId });

    const { page, limit, ...filterFields } = filters;
    const ALLOWED_FILTERS = ['name', 'category'];

    Object.entries(filterFields).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`inventory.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    return paginate(queryBuilder, page, limit);
  }

  async findOne(id: string): Promise<Inventory> {
    const tenantId = this.tenantContextService.getTenantId();
    const inventory = await this.inventoryRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }

    return inventory;
  }
}
