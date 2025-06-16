import { BaseTransactionEntity } from 'src/common/entities/base-transaction.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { PurchaseInventory } from './purchase-inventory.entity';
import { Vendor } from 'src/vendor/entity/vendor.entity';

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
}
