import { BaseTransactionEntity } from 'src/common/entities/base-transaction.entity';
import { Customer } from 'src/customer/entity/customer.entity';
import { Entity, JoinColumn, OneToMany, ManyToOne, Column } from 'typeorm';
import { SaleInventory } from './sale-inventory.entity';

@Entity()
export class Sale extends BaseTransactionEntity {
  @OneToMany(() => SaleInventory, (saleInventory) => saleInventory.sale)
  inventories: SaleInventory[];

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column()
  type: 'SALE' | 'RETURN';

  @Column({ nullable: true })
  notes?: string;
}
