import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { IsStringNumberMap } from 'src/common/validators/is-string-number-map.validator';

export class CreateInventoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  baseRate: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sellingRate?: number;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  openingDate: Date;

  @IsStringNumberMap({
    message:
      'multiUnits must be a map of non-empty string keys to number values',
  })
  @IsOptional()
  multiUnits?: Record<string, number>;
}
