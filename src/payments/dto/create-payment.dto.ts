import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BaseFinancialDto } from 'src/common/dtos/create-base-financial.dto';

class PurchaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
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
