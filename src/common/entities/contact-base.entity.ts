import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class ContactBaseEntity extends BaseEntity {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  person_name: string;

  @Column()
  address: string;

  @Column()
  contact_number: string;

  @Column({ unique: true })
  code: string;

  @Column()
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

  @Column()
  openingBalanceDate: Date;

  @Column()
  status: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
