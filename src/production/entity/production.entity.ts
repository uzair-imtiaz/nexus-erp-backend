import { BaseEntity } from 'src/common/entities/base.entity';
import { Formulation } from 'src/formulation/entity/formulation.entity';
import { Journal } from 'src/journal/entity/journal.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Production extends BaseEntity {
  @ManyToOne(() => Formulation)
  @JoinColumn({ name: 'formulation_id' })
  formulation: Formulation;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalCost: number;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'timestamp with time zone' })
  date: Date;

  @Column()
  status: 'In Progress' | 'Completed';

  @OneToOne(() => Journal)
  @JoinColumn({ name: 'journal_id' })
  journal: Journal;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
