import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreatePaymentdto } from './dto/create-payment.dto';
import { TransactionRequest } from 'src/common/interfaces/request.interfaces';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { PaymentFilterDto } from './dto/payment-filter.dto';

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
}
