import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class Account extends BaseEntity {
  @Column()
  name: string;

  @Column()
  type: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn()
  parentAccount: Account;
}
