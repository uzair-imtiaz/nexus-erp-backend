import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Bank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bankCode: string;

  @Column()
  bankName: string;

  @Column()
  accountNumber: string;

  @Column()
  iban: string;

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
  currentBalance: number;

  @Column({ type: 'date' })
  openingDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
