import { Bank } from 'src/bank/entity/bank.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Entity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ExpenseDetail } from './expense-detail.entity';

@Entity()
export class Expense extends BaseEntity {
  @ManyToOne(() => Bank)
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  @OneToMany(() => ExpenseDetail, (detail) => detail.expense)
  details: ExpenseDetail[];

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
