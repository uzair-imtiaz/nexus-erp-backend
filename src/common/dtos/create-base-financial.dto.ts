import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentTypes } from '../enums/payment-type.enum';

export class BaseFinancialDto {
  @IsOptional()
  @IsString()
  ref?: string;

  @IsDate()
  date: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(PaymentTypes)
  @IsOptional()
  paymentType?: PaymentTypes;

  @IsString()
  @IsNotEmpty()
  bankId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;
}
