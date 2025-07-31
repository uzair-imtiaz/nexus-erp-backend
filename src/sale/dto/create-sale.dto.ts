import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class InventoryDto {
  @IsString()
  id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  buyingRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
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
