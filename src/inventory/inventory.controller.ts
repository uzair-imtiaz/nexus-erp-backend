import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { UuidValidationPipe } from 'src/common/pipes/UuidValidationPipe';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { InventoryService } from './inventory.service';
import { InventoryFilterDto } from './dto/inventory-filter.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Inventories fetched successfully',
  })
  async findAll(@Query() filters: InventoryFilterDto) {
    try {
      return await this.inventoryService.findAll(filters);
    } catch (error) {
      console.log(error);
    }
  }

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Inventory created successfully',
  })
  async create(@Body() createInventoryDto: CreateInventoryDto) {
    try {
      return await this.inventoryService.create(createInventoryDto);
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':id')
  @ResponseMetadata({
    success: true,
    message: 'Inventory fetched successfully',
  })
  async findOne(
    @Param('id', UuidValidationPipe) id: string,
  ): Promise<Inventory> {
    return await this.inventoryService.findOne(id);
  }
}
