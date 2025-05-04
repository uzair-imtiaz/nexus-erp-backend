import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

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

  @IsUUID()
  accountGroup: string;

  @IsUUID()
  accountLevel1: string;

  @IsUUID()
  accountLevel2: string;

  @IsUUID()
  accountLevel3: string;
}