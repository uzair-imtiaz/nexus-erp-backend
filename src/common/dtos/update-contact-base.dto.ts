import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact-base.dto';

export class UpdateContactDto extends PartialType(CreateContactDto) {}
