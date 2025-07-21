import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class JournalFilterDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  ref?: number;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  )
  nominal_account_ids?: string[];

  @IsOptional()
  @IsDate()
  date_from?: Date;

  @IsOptional()
  @IsDate()
  date_to?: Date;
}
