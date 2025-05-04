import { Account } from "src/subcategories/entity/account-base.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Inventory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    quantity: number;

    @Column({ name: 'base_rate', type: 'decimal', precision: 10, scale: 2 })
    baseRate: number;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_group_id' }) 
    accountGroup: Account;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_level_1_id' })
    accountLevel1: Account;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_level_2_id' })
    accountLevel2: Account;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_level_3_id' })
    accountLevel3: Account;

    @CreateDateColumn({ name: 'created_at', select: false })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at', select: false })
    updatedAt: Date;
}