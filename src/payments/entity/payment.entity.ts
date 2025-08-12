import { BaseFinancialEntity } from 'src/common/entities/base-financial.entity';
import { Vendor } from 'src/vendor/entity/vendor.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Payment extends BaseFinancialEntity {
  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;
}
