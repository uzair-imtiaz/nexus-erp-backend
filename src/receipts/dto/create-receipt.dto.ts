import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseFinancialDto } from 'src/common/dtos/create-base-financial.dto';

class SaleDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  discount?: number;
}

export class CreateReceiptdto extends BaseFinancialDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsArray({
    each: true,
  })
  @IsOptional()
  transactions?: SaleDto[];
}
