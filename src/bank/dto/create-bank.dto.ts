import { IsString, IsDateString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBankDto {
  @IsString()
  name: string;

  @IsString()
  accountNumber: string;

  @IsString()
  iban: string;

  @IsNumber()
  currentBalance: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsDateString()
  openingDate: string;
}
