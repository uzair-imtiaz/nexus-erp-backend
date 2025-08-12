import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseFinancialDto } from 'src/common/dtos/create-base-financial.dto';

class PurchaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  discount?: number;
}

export class CreatePaymentdto extends BaseFinancialDto {
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseDto)
  @IsOptional()
  transactions?: PurchaseDto[];
}
