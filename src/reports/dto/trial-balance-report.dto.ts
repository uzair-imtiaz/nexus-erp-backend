import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class TrialBalanceReportDto {
  @IsDate()
  @IsOptional()
  date_from?: Date;

  @IsDate()
  @IsOptional()
  date_to?: Date;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  limit?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  )
  nominal_account_ids?: string[];
}
