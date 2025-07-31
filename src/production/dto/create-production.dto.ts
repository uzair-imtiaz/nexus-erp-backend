import { IsDate, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

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
  @Min(0)
  totalCost: number;

  @IsString()
  @IsNotEmpty()
  formulationId: string;
}
