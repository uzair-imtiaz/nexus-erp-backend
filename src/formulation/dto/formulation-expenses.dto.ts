import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FormulationExpensesDto {
  @IsNumber()
  expense_account_id: number;

  @IsNumber()
  quantityRequired: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsNumber()
  perUnit: number;

  @IsNumber()
  amount: number;
}
