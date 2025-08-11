import { ContactBaseEntity } from 'src/common/entities/contact-base.entity';
import { Sale } from 'src/sale/entity/sale.entity';
import { Entity, OneToMany, Unique } from 'typeorm';

@Entity()
@Unique(['code', 'tenant'])
export class Customer extends ContactBaseEntity {
  @OneToMany(() => Sale, (sale) => sale.customer)
  transactions: Sale[];
}
