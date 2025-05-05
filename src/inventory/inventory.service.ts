import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../subcategories/entity/account-base.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { paginate, Paginated } from 'src/common/utils/paginate';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    const inventory = new Inventory();
    inventory.name = createInventoryDto.name;
    inventory.quantity = createInventoryDto.quantity;
    inventory.baseRate = createInventoryDto.baseRate;
    inventory.accountGroup = createInventoryDto.accountGroup;
    inventory.category = createInventoryDto.category;
    inventory.baseUnit = createInventoryDto.baseUnit;

    if (createInventoryDto.accountLevel1) {
      const accountLevel1 = await this.accountRepository.findOne({
        where: { id: createInventoryDto.accountLevel1 },
      });
      if (!accountLevel1) {
        throw new NotFoundException(
          `Account Level 1 with ID ${createInventoryDto.accountLevel1} not found`,
        );
      }
      inventory.accountLevel1 = accountLevel1;
    }

    if (createInventoryDto.accountLevel2) {
      const accountLevel2 = await this.accountRepository.findOne({
        where: { id: createInventoryDto.accountLevel2 },
      });
      if (!accountLevel2) {
        throw new NotFoundException(
          `Account Level 2 with ID ${createInventoryDto.accountLevel2} not found`,
        );
      }
      inventory.accountLevel2 = accountLevel2;
    }

    const latest = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .orderBy('inventory.id', 'DESC')
      .getOne();

    const nextId = latest ? parseInt(latest.id.replace('ITEM-', '')) + 1 : 1;
    const id = `ITEM-${nextId.toString().padStart(5, '0')}`;
    inventory.id = id;

    return await this.inventoryRepository.save(inventory);
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Inventory>> {
    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.accountLevel1', 'accountLevel1')
      .leftJoinAndSelect('inventory.accountLevel2', 'accountLevel2');

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
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }

    return inventory;
  }
}
