import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Tree, TreeChildren, TreeParent } from 'typeorm';
import { AccountType } from '../interfaces/account-type.enum';

@Entity()
@Tree('closure-table')
export class Account extends BaseEntity {
  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ nullable: true, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;

  @TreeChildren()
  children: Account[];

  @TreeParent()
  parent: Account;

  @Column({ name: 'system_generated', default: false, nullable: true })
  systemGenerated: boolean;
}
