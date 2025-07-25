import { forwardRef, Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entity/vendor.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { AccountModule } from 'src/account/account.module';
import { AuthModule } from 'src/auth/auth.module';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    TenantModule,
    AuthModule,
    AccountModule,
    forwardRef(() => JournalModule),
  ],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
