import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ProductionService } from './production.service';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreateProductionDto } from './dto/create-production.dto';
import { ProductionFilterDto } from './dto/production-filter.dto';
import { TransactionRequest } from 'src/common/interfaces/request.interfaces';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Production created successfully',
  })
  async create(
    @Body() createProductionDto: CreateProductionDto,
    @Req() req: TransactionRequest,
  ) {
    return await this.productionService.create(
      createProductionDto,
      req.queryRunner,
    );
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Productions fetched successfully',
  })
  async findAll(@Query() filters: ProductionFilterDto) {
    return await this.productionService.findAll(filters);
  }

  @Get(':id')
  @ResponseMetadata({
    success: true,
    message: 'Production fetched successfully',
  })
  async findOne(@Param('id') id: string) {
    return await this.productionService.findOne(id);
  }

  @Post(':id/status')
  @ResponseMetadata({
    success: true,
    message: 'Production status changed successfully',
  })
  async changeStatus(@Param('id') id: string, @Req() req: TransactionRequest) {
    return await this.productionService.changeStatus(id, req.queryRunner);
  }
}
