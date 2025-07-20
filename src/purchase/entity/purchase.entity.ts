import { BaseTransactionEntity } from 'src/common/entities/base-transaction.entity';
import { Vendor } from 'src/vendor/entity/vendor.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { PurchaseInventory } from './purchase-inventory.entity';
import { Journal } from 'src/journal/entity/journal.entity';

@Entity()
export class Purchase extends BaseTransactionEntity {
  @OneToMany(
    () => PurchaseInventory,
    (purchaseInventory) => purchaseInventory.purchase,
  )
  inventories: PurchaseInventory[];

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'customer_id' })
  vendor: Vendor;

  @Column()
  type: 'PURCHASE' | 'RETURN';

  @OneToOne(() => Journal)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;
}
