import { IsNumber, IsOptional, IsString } from 'class-validator';

export class FormulationProductDto {
  @IsNumber()
  product_id: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  qtyFiPercent?: number;

  @IsString()
  unit: string;

  @IsNumber()
  baseQuantity: number;

  @IsNumber()
  costFiPercent: number;

  @IsNumber()
  quantityRequired: number;
}
