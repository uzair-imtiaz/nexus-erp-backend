import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TransactionRequest } from 'src/common/interfaces/TransactionRequest';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { SaleFilterDto } from './dto/sale-filters.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @UseInterceptors(TransactionInterceptor)
  @ResponseMetadata({
    success: true,
    message: 'Sale created successfully',
  })
  @Post()
  async create(
    @Body() createSaleDto: CreateSaleDto,
    @Req() req: TransactionRequest,
  ) {
    if (createSaleDto.type.toLowerCase() === 'sale')
      return await this.saleService.createSale(createSaleDto, req.queryRunner);
    else
      return await this.saleService.createReturn(
        createSaleDto,
        req.queryRunner,
      );
  }

  @ResponseMetadata({
    success: true,
    message: 'Sales fetched successfully',
  })
  @Get()
  async findAll(@Query() filters: SaleFilterDto) {
    return await this.saleService.findAll(filters);
  }
}
