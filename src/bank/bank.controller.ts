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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { TransactionRequest } from 'src/common/interfaces/TransactionRequest';
import { TenantGuard } from 'src/tenant/guards/tenant.guard';
import { BankService } from './bank.service';
import { BankFilterDto } from './dto/bank-filter.dto';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Controller('banks')
@UseGuards(TenantGuard)
@UseGuards(JwtAuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  @UseInterceptors(TransactionInterceptor)
  @ResponseMetadata({
    success: true,
    message: 'Bank created successfully',
  })
  create(@Body() dto: CreateBankDto, @Req() req: TransactionRequest) {
    return this.bankService.create(dto, req.queryRunner);
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Banks fetched successfully',
  })
  findAll(@Query() filters: BankFilterDto) {
    return this.bankService.findAll(filters);
  }

  @ResponseMetadata({
    success: true,
    message: 'Bank fetched successfully',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankService.findOne(id);
  }

  @Put(':id')
  @ResponseMetadata({
    success: true,
    message: 'Bank updated successfully',
  })
  @UseInterceptors(TransactionInterceptor)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBankDto,
    @Req() req: TransactionRequest,
  ) {
    return this.bankService.update(id, dto, req.queryRunner);
  }

  @Delete(':id')
  @ResponseMetadata({
    success: true,
    message: 'Bank deleted successfully',
  })
  @UseInterceptors(TransactionInterceptor)
  remove(@Param('id') id: string, @Req() req: TransactionRequest) {
    return this.bankService.remove(id, req.queryRunner);
  }
}
