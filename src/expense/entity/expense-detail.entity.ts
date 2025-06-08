import { Entity, ManyToOne, JoinColumn, Column } from 'typeorm';
import { BaseTransactionDetail } from 'src/common/entities/base-transaction-detail.entity';
import { Expense } from './expense.entity';

@Entity()
export class ExpenseDetail extends BaseTransactionDetail {
  @ManyToOne(() => Expense, (expense) => expense.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  amount: number;
}
