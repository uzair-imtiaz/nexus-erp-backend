import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { FormulationProduct } from './formulation-products.interface';
import { FormulationExpenses } from './formulation-expenses.interface';
import { FormulationIngredient } from './formulation-ingredients.interface';

@Entity()
export class Formulation extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({
    name: 'rm_factor',
    type: 'decimal',
    default: 1,
  })
  rmFactor?: number;

  @Column({ type: 'jsonb' })
  products: FormulationProduct[];

  @Column({ type: 'jsonb' })
  ingredients: FormulationIngredient[];

  @Column({ type: 'jsonb' })
  expenses: FormulationExpenses[];

  @Column({ type: 'decimal', name: 'total_cost' })
  totalCost: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
