import { ContactBaseEntity } from 'src/common/entities/contact-base.entity';
import { Entity, Unique } from 'typeorm';

@Entity()
@Unique(['code', 'tenant'])
export class Vendor extends ContactBaseEntity {}
