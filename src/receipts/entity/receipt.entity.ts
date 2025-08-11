import { BaseFinancialEntity } from 'src/common/entities/base-financial.entity';
import { Customer } from 'src/customer/entity/customer.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Receipt extends BaseFinancialEntity {
  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
