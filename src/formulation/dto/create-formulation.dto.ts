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
import { FormulationExpensesDto } from './formulation-expenses.dto';
import { FormulationIngredientDto } from './formulation-ingredients.dto';
import { FormulationProductDto } from './formulation-products.dto';

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
  @Min(0)
  totalCost: number;
}
