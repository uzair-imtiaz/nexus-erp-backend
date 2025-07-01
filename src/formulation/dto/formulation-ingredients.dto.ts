import { IsNumber, IsOptional, IsString } from 'class-validator';

export class FormulationIngredientDto {
  @IsNumber()
  inventory_item_id: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  quantityRequired: number;

  @IsNumber()
  perUnit: number;

  @IsString()
  unit: string;
}
