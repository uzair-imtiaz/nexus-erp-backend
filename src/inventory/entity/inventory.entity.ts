import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['code', 'tenant'])
export class Inventory extends BaseEntity {
  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  quantity: number;

  @Column({
    name: 'base_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  baseRate: number;

  @Column({
    name: 'selling_rate',
    nullable: true,
    type: 'decimal',
    precision: 8,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  sellingRate: number;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'base_unit', nullable: true })
  baseUnit: string;

  @Column({
    name: 'opening_date',
    type: 'timestamp with time zone',
    nullable: true,
  })
  openingDate: Date;

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'multi_units' })
  multiUnits: Record<string, number>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  deletedAt: Date;
}
