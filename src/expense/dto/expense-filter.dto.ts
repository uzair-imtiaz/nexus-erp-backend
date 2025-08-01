import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ExpenseFilterDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit: number = 20;

  @IsOptional()
  @IsString()
  bank_id?: string;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  nominal_account_ids?: string[];

  @IsOptional()
  @IsDate()
  date_from?: Date;

  @IsOptional()
  @IsDate()
  date_to?: Date;
}
