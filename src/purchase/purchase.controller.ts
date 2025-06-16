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
import { PurchaseService } from './purchase.service';
import { TenantGuard } from 'src/tenant/guards/tenant.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { PurchaseFilterDto } from './dto/purchase-filters.dto';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { TransactionRequest } from 'src/common/interfaces/TransactionRequest';

@UseGuards(TenantGuard)
@UseGuards(JwtAuthGuard)
@Controller('purchase')
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
    if (createPurchaseDto.type.toLowerCase() === 'sale')
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
  async findAll(@Query() filters: PurchaseFilterDto) {
    return await this.purchaseService.findAll(filters);
  }
}
