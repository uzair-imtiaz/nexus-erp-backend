import { Account } from 'src/subcategories/entity/account-base.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Inventory {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  quantity: number;

  @Column({
    name: 'base_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  baseRate: number;

  @Column({ name: 'account_group', default: 'asset' })
  accountGroup: string;

  @Column({ nullable: true })
  category: string;

  @Column()
  baseUnit: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_level_1_id' })
  accountLevel1: Account;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_level_2_id' })
  accountLevel2: Account;

  @CreateDateColumn({ name: 'created_at', select: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', select: false })
  updatedAt: Date;
}
