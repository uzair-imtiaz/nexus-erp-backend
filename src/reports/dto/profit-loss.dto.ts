import { IsDate, IsOptional } from 'class-validator';

export class ProfitAndLossReportDto {
  @IsDate()
  @IsOptional()
  date_from?: Date;

  @IsDate()
  @IsOptional()
  date_to?: Date;
}

export interface ProfitAndLossAccount {
  id: string;
  name: string;
  amount: number;
}

export interface ProfitAndLossSection {
  name: string;
  total: number;
  accounts: ProfitAndLossAccount[];
}

export interface ProfitAndLossReportResponseDto {
  turnover: ProfitAndLossSection;
  costOfSales: ProfitAndLossSection;
  grossProfit: number;
  operatingProfit: number;
  operatingExpenses: ProfitAndLossSection;
  nonOperatingExpenses: ProfitAndLossSection;
  earningsBeforeTax: number;
  dateFrom?: Date;
  dateTo?: Date;
}
