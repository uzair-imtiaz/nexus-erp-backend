import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Inventory } from 'src/inventory/entity/inventory.entity';

export abstract class BaseTransactionInventory extends BaseEntity {
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

  @Column({ nullable: true })
  name: string;

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
