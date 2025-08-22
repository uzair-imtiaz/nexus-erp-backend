import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { TenantGuard } from 'src/tenant/guards/tenant.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { PurchaseFilterDto } from './dto/purchase-filters.dto';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { TransactionRequest } from 'src/common/interfaces/request.interfaces';
import { SkipResponseMetadata } from 'src/common/decorators/skip-response-interceptor.decorator';
import { Response } from 'express';
import * as path from 'path';

@UseGuards(TenantGuard)
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Purchase created successfully',
  })
  @UseInterceptors(TransactionInterceptor)
  async create(
    @Body() createPurchaseDto: CreatePurchaseDto,
    @Req() req: TransactionRequest,
  ) {
    if (createPurchaseDto.type.toLowerCase() === 'purchase')
      return await this.purchaseService.createPurchase(
        createPurchaseDto,
        req.queryRunner,
      );
    else
      return await this.purchaseService.createReturn(
        createPurchaseDto,
        req.queryRunner,
      );
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Purchases fetched successfully',
  })
  async findAll(@Query() filters: PurchaseFilterDto) {
    return await this.purchaseService.findAll(filters);
  }

  @Get(':purchaseId/bill/view')
  @SkipResponseMetadata()
  async viewInvoice(
    @Param('purchaseId') purchaseId: string,
    @Res() res: Response,
  ) {
    const fileName = await this.purchaseService.generateBill(purchaseId);
    const filePath = await this.purchaseService.getBillFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }

  @Get(':purchaseId/bill/download')
  @SkipResponseMetadata()
  async downloadInvoice(
    @Param('purchaseId') purchaseId: string,
    @Res() res: Response,
  ) {
    const fileName = await this.purchaseService.generateBill(purchaseId);
    const filePath = await this.purchaseService.getBillFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }
}
