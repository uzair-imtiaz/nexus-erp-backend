import { BaseTransactionInventory } from 'src/common/entities/base-transaction-inventory.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Purchase } from './purchase.entity';

@Entity({ name: 'purchase_inventory' })
export class PurchaseInventory extends BaseTransactionInventory {
  @ManyToOne(() => Purchase, (purchase) => purchase.inventories)
  @JoinColumn({ name: 'sale_id' })
  purchase: Purchase;
}
