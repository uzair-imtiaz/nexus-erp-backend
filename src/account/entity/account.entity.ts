import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { AccountType } from '../interfaces/account-type.enum';

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

  @Column({ nullable: true, name: 'entity_type' })
  entityType: string;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;

  @Column({ default: false, name: 'system_generated', nullable: true })
  systemGenerated: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @BeforeInsert()
  @BeforeUpdate()
  async setPath() {
    if (this.parent) {
      if (!this.parent.path) {
        throw new Error('Parent account path is required');
      }
      this.path = `${this.parent.path}/${this.code}`;
    } else {
      this.path = this.code;
    }
  }
}
