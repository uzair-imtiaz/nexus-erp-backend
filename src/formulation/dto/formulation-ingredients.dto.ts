import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FormulationIngredientDto {
  @IsNumber()
  inventory_item_id: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  availableQuantity: number;

  @IsNumber()
  amount: number;

  @IsNumber()
  quantityRequired: number;

  @IsNumber()
  perUnit: number;

  @IsString()
  unit: string;
}
