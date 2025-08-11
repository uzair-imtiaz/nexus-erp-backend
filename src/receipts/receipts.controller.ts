import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptdto } from './dto/create-receipt.dto';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { TransactionRequest } from 'src/common/interfaces/request.interfaces';
import { ReceiptFiltrDto } from './dto/receipt-filtr.dto';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Receipt created successfully',
  })
  @UseInterceptors(TransactionInterceptor)
  async create(
    @Body() createReceiptDto: CreateReceiptdto,
    @Req() req: TransactionRequest,
  ) {
    return await this.receiptsService.create(createReceiptDto, req.queryRunner);
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Receipts fetched successfully',
  })
  async findAll(@Query() filters: ReceiptFiltrDto) {
    return await this.receiptsService.getAll(filters);
  }
}
