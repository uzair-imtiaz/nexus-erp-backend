import { PartialType } from '@nestjs/mapped-types';
import { CreateReceiptdto } from './create-receipt.dto';

export class UpdateReceiptDto extends PartialType(CreateReceiptdto) {}
