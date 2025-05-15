import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ResponseMetadata({
    message: 'Customer created successfully',
    success: true,
  })
  async create(createCustomerDto: CreateCustomerDto) {
    return await this.customerService.create(createCustomerDto);
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

  @Put('id')
  @ResponseMetadata({
    message: 'Customer updated successfully',
    success: true,
  })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return await this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ResponseMetadata({
    message: 'Customer deleted successfully',
    success: true,
  })
  async remove(@Param('id') id: string) {
    return await this.customerService.remove(id);
  }
}
