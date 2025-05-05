import { IsString, IsDateString, IsNumber } from 'class-validator';

export class CreateBankDto {
  @IsString()
  bankCode: string;

  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  iban: string;

  @IsNumber()
  currentBalance: number;

  @IsDateString()
  openingDate: string;
}
