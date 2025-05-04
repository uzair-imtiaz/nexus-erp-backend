import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../subcategories/entity/account-base.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory } from './entity/inventory.entity';

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

    // Handle account relationships
    if (createInventoryDto.accountGroup) {
      const accountGroup = await this.accountRepository.findOne({
        where: { id: createInventoryDto.accountGroup },
      });
      if (!accountGroup) {
        throw new NotFoundException(
          `Account Group with ID ${createInventoryDto.accountGroup} not found`,
        );
      }
      inventory.accountGroup = accountGroup;
    }

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

    if (createInventoryDto.accountLevel3) {
      const accountLevel3 = await this.accountRepository.findOne({
        where: { id: createInventoryDto.accountLevel3 },
      });
      if (!accountLevel3) {
        throw new NotFoundException(
          `Account Level 3 with ID ${createInventoryDto.accountLevel3} not found`,
        );
      }
      inventory.accountLevel3 = accountLevel3;
    }
    // Save and return the new inventory
    return await this.inventoryRepository.save(inventory);
  }

  async findAll(): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      relations: ['accountGroup', 'accountLevel1', 'accountLevel2', 'accountLevel3'],
    });
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
