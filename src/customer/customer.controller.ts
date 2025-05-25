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
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { TransactionRequest } from 'src/common/interfaces/TransactionRequest';
import { TenantGuard } from 'src/tenant/guards/tenant.guard';

@Controller('customer')
@UseGuards(JwtAuthGuard)
@UseGuards(TenantGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseInterceptors(TransactionInterceptor)
  @Post()
  @ResponseMetadata({
    message: 'Customer created successfully',
    success: true,
  })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: TransactionRequest,
  ) {
    return await this.customerService.create(
      createCustomerDto,
      req.queryRunner,
    );
  }

  @Get()
  @ResponseMetadata({
    message: 'Customers fetched successfully',
    success: true,
  })
  async findAll(@Query() filters: CustomerFilterDto) {
    return await this.customerService.findAll(filters);
  }

  @Get(':id')
  @ResponseMetadata({
    message: 'Customer fetched successfully',
    success: true,
  })
  async findOne(@Param('id') id: string) {
    return await this.customerService.findOne(id);
  }

  @UseInterceptors(TransactionInterceptor)
  @Put('id')
  @ResponseMetadata({
    message: 'Customer updated successfully',
    success: true,
  })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Req() req: TransactionRequest,
  ) {
    return await this.customerService.update(
      id,
      updateCustomerDto,
      req.queryRunner,
    );
  }

  @UseInterceptors(TransactionInterceptor)
  @Delete(':id')
  @ResponseMetadata({
    message: 'Customer deleted successfully',
    success: true,
  })
  async remove(@Param('id') id: string, @Req() req: TransactionRequest) {
    return await this.customerService.remove(id, req.queryRunner);
  }
}
