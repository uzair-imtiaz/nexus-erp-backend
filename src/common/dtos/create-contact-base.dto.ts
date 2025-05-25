import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  personName: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  contactNumber?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  openingBalance: number;

  @IsDateString()
  openingBalanceDate: string;

  @IsBoolean()
  status: boolean;
}
