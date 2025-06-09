import { Entity, ManyToOne, JoinColumn, Column } from 'typeorm';
import { BaseTransactionDetail } from 'src/common/entities/base-transaction-detail.entity';
import { Journal } from './journal.entity';

@Entity()
export class JournalDetail extends BaseTransactionDetail {
  @ManyToOne(() => Journal, (journal) => journal.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number;
}
