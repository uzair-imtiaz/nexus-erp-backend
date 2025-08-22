import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { SaleFilterDto } from './dto/sale-filters.dto';
import { TransactionRequest } from 'src/common/interfaces/request.interfaces';
import { UpdateSaleDto } from './dto/update-sale.dto';
import * as path from 'path';
import { Response } from 'express';
import { SkipResponseMetadata } from 'src/common/decorators/skip-response-interceptor.decorator';

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

  @ResponseMetadata({
    success: true,
    message: 'Sale fetched successfully',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.saleService.findOne(id);
  }

  @ResponseMetadata({
    success: true,
    message: 'Sale updated successfully',
  })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @Req() req: TransactionRequest,
  ) {
    return await this.saleService.update(id, updateSaleDto, req.queryRunner);
  }

  @ResponseMetadata({
    success: true,
    message: 'Sale deleted successfully',
  })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.saleService.remove(id);
  }

  @Get(':saleId/invoice/view')
  @SkipResponseMetadata()
  async viewInvoice(@Param('saleId') saleId: string, @Res() res: Response) {
    const fileName = await this.saleService.generateInvoice(saleId);
    const filePath = await this.saleService.getInvoiceFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }

  @Get(':saleId/invoice/download')
  @SkipResponseMetadata()
  async downloadInvoice(@Param('saleId') saleId: string, @Res() res: Response) {
    const fileName = await this.saleService.generateInvoice(saleId);
    const filePath = await this.saleService.getInvoiceFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }
}
