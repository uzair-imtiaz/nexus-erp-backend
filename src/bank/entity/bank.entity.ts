import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@Entity()
export class Bank extends BaseEntity {
  @Column()
  name: string;

  @Column()
  accountNumber: string;

  @Column()
  iban: string;

  @Column({ unique: true })
  code: string;

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
