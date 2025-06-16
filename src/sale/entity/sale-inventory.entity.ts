import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Sale } from './sale.entity';
import { Inventory } from 'src/inventory/entity/inventory.entity';
import { BaseTransactionInventory } from 'src/common/entities/base-transaction-inventory.entity';

@Entity('sale_inventories')
export class SaleInventory extends BaseTransactionInventory {
  @ManyToOne(() => Sale, (sale) => sale.inventories)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;
}
