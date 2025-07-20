import { BaseTransactionEntity } from 'src/common/entities/base-transaction.entity';
import { Customer } from 'src/customer/entity/customer.entity';
import {
  Entity,
  JoinColumn,
  OneToMany,
  ManyToOne,
  Column,
  OneToOne,
} from 'typeorm';
import { SaleInventory } from './sale-inventory.entity';
import { Journal } from 'src/journal/entity/journal.entity';

@Entity()
export class Sale extends BaseTransactionEntity {
  @OneToMany(() => SaleInventory, (saleInventory) => saleInventory.sale)
  inventories: SaleInventory[];

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToOne(() => Journal)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  @Column()
  type: 'SALE' | 'RETURN';
}
