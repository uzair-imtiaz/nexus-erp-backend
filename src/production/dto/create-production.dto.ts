import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
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
