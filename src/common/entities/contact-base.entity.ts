import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class ContactBaseEntity extends BaseEntity {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, name: 'person_name' })
  personName: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, name: 'contact_number' })
  contactNumber: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  email: string;

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  openingBalance: number;

  @Column({ name: 'opening_balance_date', type: 'date' })
  openingBalanceDate: Date;

  @Column()
  status: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
