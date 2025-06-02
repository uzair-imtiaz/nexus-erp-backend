import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Entity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Account } from 'src/account/entity/account.entity';
import { Expense } from './expense.entity';

@Entity()
export class ExpenseDetail extends BaseEntity {
  @ManyToOne(() => Expense, (expense) => expense.details)
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'nominal_account_id' })
  nominalAccount: Account;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
