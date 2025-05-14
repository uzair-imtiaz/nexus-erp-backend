import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Account extends BaseEntity {
  @Column()
  name: string;

  @Column()
  level: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parentAccount: Account;

  @Column({ unique: true, type: 'varchar', length: 30 })
  code: string;

  @Column({ nullable: true, name: 'entity_type' })
  entityType: string;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;
}
