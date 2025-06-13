import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class InventoryDto {
  @IsString()
  id: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  rate: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  tax?: number;
}

export class CreateSaleDto {
  @IsString()
  @IsOptional()
  ref?: string;

  @IsString()
  type: 'SALE' | 'RETURN';

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => InventoryDto)
  items: InventoryDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
