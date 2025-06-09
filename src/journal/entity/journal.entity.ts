import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { JournalDetail } from './journal-detail.entity';

@Entity()
export class Journal extends BaseEntity {
  @Column({ unique: true })
  ref: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => JournalDetail, (detail) => detail.journal)
  details: JournalDetail[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
