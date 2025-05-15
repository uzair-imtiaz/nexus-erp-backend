import { Injectable } from '@nestjs/common';
import { Customer } from './entity/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { GenericService } from 'src/common/services/generic.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class CustomerService extends GenericService<
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto
> {
  constructor(
    @InjectRepository(Customer)
    customerRepository: Repository<Customer>,
    tenantContextService: TenantContextService,
  ) {
    super(customerRepository, tenantContextService, 'customer');
  }
}
