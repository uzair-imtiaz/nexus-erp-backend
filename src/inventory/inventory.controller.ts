import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { UuidValidationPipe } from 'src/common/pipes/UuidValidationPipe';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ResponseMetadata({ success: true, message: 'Inventories fetched successfully' })
  async findAll(): Promise<Inventory[]> {
    return await this.inventoryService.findAll();
  }

  @Post()
  @ResponseMetadata({ success: true, message: 'Inventory created successfully' })
  async create(@Body() createInventoryDto: CreateInventoryDto) {
    try {
      return await this.inventoryService.create(createInventoryDto);
    } catch (error) {
      console.log(error)
    }
  }

  @Get(':id')
  @ResponseMetadata({ success: true, message: 'Inventory fetched successfully' })
  async findOne(@Param('id', UuidValidationPipe) id: string,): Promise<Inventory> {
    return await this.inventoryService.findOne(id);
  }
}
