import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateProductionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsDate()
  date: Date;

  @IsNumber()
  @IsPositive()
  totalCost: number;

  @IsString()
  @IsNotEmpty()
  formulationId: string;
}
