import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class InventoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    quantity: number;

    @Column({ name: 'base_rate' })
    baseRate: string;

    @CreateDateColumn({ name: 'created_at', select: false })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at', select: false })
    updatedAt: Date;
}