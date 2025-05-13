import { Injectable } from '@nestjs/common';
import { GenericService } from 'src/common/services/generic.service';
import { Vendor } from './entity/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateContactDto } from 'src/common/dtos/update-contact-base.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class VendorService extends GenericService<
  Vendor,
  CreateVendorDto,
  UpdateContactDto
> {
  constructor(
    @InjectRepository(Vendor) vendorRepository: Repository<Vendor>,
    tenantContextService: TenantContextService,
  ) {
    super(vendorRepository, tenantContextService, 'vendor');
  }
}
