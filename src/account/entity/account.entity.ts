import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType } from '../interfaces/account-type.enum';
import { EntityType } from 'src/common/enums/entity-type.enum';

@Entity()
export class Account extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Account;

  @Column({ unique: true, type: 'varchar', length: 30 })
  code: string;

  @Column({
    nullable: true,
    name: 'entity_type',
    type: 'enum',
    enum: EntityType,
  })
  entityType?: string;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;

  @Column({ default: false, name: 'system_generated', nullable: true })
  systemGenerated: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'debit_amount',
  })
  debitAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'credit_amount',
  })
  creditAmount: number;

  @Column({ name: 'path_name', nullable: true })
  pathName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Expose()
  getAmount(): number {
    return this.debitAmount - this.creditAmount;
  }

  @Expose()
  get amount(): number {
    return this.getAmount();
  }

  @BeforeInsert()
  async setPath() {
    if (this.parent) {
      if (!this.parent.path) {
        throw new Error('Parent account path is required');
      }

      this.path = `${this.parent.path}/${this.code}`;

      this.pathName = this.parent.pathName
        ? `${this.parent.pathName}/${this.parent.name}`
        : this.parent.name;
    } else {
      this.path = this.code;
      this.pathName = '';
    }
  }
}
