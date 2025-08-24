import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreatePaymentdto } from './dto/create-payment.dto';
import { TransactionRequest } from 'src/common/interfaces/request.interfaces';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { SkipResponseMetadata } from 'src/common/decorators/skip-response-interceptor.decorator';
import { Response } from 'express';
import * as path from 'path';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Payment created successfully',
  })
  @UseInterceptors(TransactionInterceptor)
  create(
    @Body() createPaymentDto: CreatePaymentdto,
    @Req() req: TransactionRequest,
  ) {
    return this.paymentsService.create(createPaymentDto, req.queryRunner);
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Payments fetched successfully',
  })
  findAll(@Query() filters: PaymentFilterDto) {
    return this.paymentsService.findAll(filters);
  }

  @Get(':id')
  @ResponseMetadata({
    success: true,
    message: 'Payment fetched successfully',
  })
  findOne(@Param('id') id: string) {
    return this.paymentsService.getOne(id);
  }

  @Get(':paymentId/view')
  @SkipResponseMetadata()
  async viewInvoice(
    @Param('purchaseId') purchaseId: string,
    @Res() res: Response,
  ) {
    const fileName = await this.paymentsService.generatePayment(purchaseId);
    const filePath = await this.paymentsService.getPaymentFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }

  @Get(':paymentId/download')
  @SkipResponseMetadata()
  async downloadInvoice(
    @Param('purchaseId') purchaseId: string,
    @Res() res: Response,
  ) {
    const fileName = await this.paymentsService.generatePayment(purchaseId);
    const filePath = await this.paymentsService.getPaymentFile(fileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }
}
