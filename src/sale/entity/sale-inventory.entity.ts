import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Sale } from './sale.entity';
import { Inventory } from 'src/inventory/entity/inventory.entity';

@Entity('sale_inventories')
export class SaleInventory extends BaseEntity {
  @ManyToOne(() => Sale, (sale) => sale.inventories)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  rate: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column()
  unit: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  tax: number;
}
