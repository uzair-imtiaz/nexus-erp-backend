import { BadRequestException, Get, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InventoryEntity } from './entity/inventory.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryEntity)
    private inventoryRepository: Repository<InventoryEntity>,
  ) {}

  async getInventories() {
    const inventory = await this.inventoryRepository.find();
    if (!inventory) {
      const errorMsg = 'Inventory not found';
      throw new BadRequestException(errorMsg);
    }
    return inventory;
  }
}
