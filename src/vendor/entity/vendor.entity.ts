import { ContactBaseEntity } from 'src/common/entities/contact-base.entity';
import { Purchase } from 'src/purchase/entity/purchase.entity';
import { Entity, OneToMany, Unique } from 'typeorm';

@Entity()
@Unique(['code', 'tenant'])
export class Vendor extends ContactBaseEntity {
  @OneToMany(() => Purchase, (purchase) => purchase.vendor)
  transactions: Purchase[];
}
