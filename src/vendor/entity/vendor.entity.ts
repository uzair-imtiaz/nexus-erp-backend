import { ContactBaseEntity } from 'src/common/entities/contact-base.entity';
import { Entity } from 'typeorm';

@Entity()
export class Vendor extends ContactBaseEntity {}
