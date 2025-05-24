import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { UuidValidationPipe } from 'src/common/pipes/UuidValidationPipe';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entity/inventory.entity';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Inventories fetched successfully',
  })
  async findAll(@Query() filters: InventoryFilterDto) {
    return await this.inventoryService.findAll(filters);
  }

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Inventory created successfully',
  })
  async create(@Body() createInventoryDto: CreateInventoryDto) {
    return await this.inventoryService.create(createInventoryDto);
  }

  @Get(':id')
  @ResponseMetadata({
    success: true,
    message: 'Inventory fetched successfully',
  })
  async findOne(@Param('id') id: string): Promise<Inventory> {
    return await this.inventoryService.findOne(id);
  }

  @Put(':id')
  @ResponseMetadata({
    success: true,
    message: 'Inventory updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return await this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(':id')
  @ResponseMetadata({
    success: true,
    message: 'Inventory deleted successfully',
  })
  async delete(@Param('id') id: string) {
    return await this.inventoryService.delete(id);
  }
}
