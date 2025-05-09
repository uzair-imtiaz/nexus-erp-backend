import { Tenant } from 'src/tenant/entity/tenant.entity';
import { ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}
