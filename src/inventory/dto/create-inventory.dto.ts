import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { MultiUnitDto } from './multi-tenant.dto';

export class CreateInventoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  baseRate: number;

  @IsNotEmpty()
  @IsString()
  accountGroup: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @IsString()
  @IsNotEmpty()
  accountLevel1: string;

  @IsString()
  @IsNotEmpty()
  accountLevel2: string;

  @IsArray()
  @IsOptional()
  multiUnits?: MultiUnitDto[];
}
