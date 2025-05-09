import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

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
}
