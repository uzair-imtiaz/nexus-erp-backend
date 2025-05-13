import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entity/vendor.entity';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor]), TenantModule],
  controllers: [VendorController],
  providers: [VendorService],
})
export class VendorModule {}
