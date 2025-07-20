import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class JournalDetailDto {
  @IsString()
  @IsNotEmpty()
  nominalAccountId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  credit: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  debit: number;
}

export class CreateJournalDto {
  @IsString()
  @IsNotEmpty()
  ref?: string;

  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => JournalDetailDto)
  details: JournalDetailDto[];
}
