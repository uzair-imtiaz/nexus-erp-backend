import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  IsDate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ExpenseDetailDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    value !== null && value !== undefined ? String(value) : value,
  )
  nominalAccountId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsString()
  bankId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ExpenseDetailDto)
  details: ExpenseDetailDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsDate()
  @IsOptional()
  date?: Date;
}
