import { Account } from 'src/account/entity/account.entity';
import { Tenant } from 'src/tenant/entity/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Inventory {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  quantity: number;

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
  baseRate: number;

  @Column({ nullable: true })
  category: string;

  @Column()
  baseUnit: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column({ type: 'jsonb', nullable: true })
  multiUnits: { name: string; factor: number }[];

  @CreateDateColumn({ name: 'created_at', select: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', select: false })
  updatedAt: Date;
}
