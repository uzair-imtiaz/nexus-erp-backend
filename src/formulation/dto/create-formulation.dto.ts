import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormulationProductDto } from './formulation-products.dto';
import { FormulationExpensesDto } from './formulation-expenses.dto';
import { FormulationIngredientDto } from './formulation-ingredients.dto';

export class CreateFormulationDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  rmFactor?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulationProductDto)
  products: FormulationProductDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulationIngredientDto)
  ingredients: FormulationIngredientDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulationExpensesDto)
  expenses: FormulationExpensesDto[];

  @IsNumber()
  @IsPositive()
  totalCost: number;
}
