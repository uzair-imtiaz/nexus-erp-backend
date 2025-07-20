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
export class Bank extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true, name: 'account_number' })
  accountNumber: string;

  @Column()
  iban: string;

  @Column()
  code: string;

  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  currentBalance: number;

  @Column({ type: 'timestamptz', name: 'opening_date' })
  openingDate: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
