import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentdto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentdto) {}
