import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AssetSectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  accounts: BalanceSheetAccountDto[];

  @IsNumber()
  total: number;
}

export class AssetsDto {
  @IsObject()
  @Type(() => AssetSectionDto)
  @ValidateNested()
  current: AssetSectionDto;

  @IsObject()
  @Type(() => AssetSectionDto)
  @ValidateNested()
  nonCurrent: AssetSectionDto;
}

export class BalanceSheetAccountDto {
  @IsString()
  name: string;

  @IsNumber()
  balance: number;
}

export class BalanceSheetSectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BalanceSheetAccountDto)
  accounts: BalanceSheetAccountDto[];

  @IsNumber()
  total: number;
}

export class BalanceSheetResponseDto {
  @IsDate()
  @Type(() => Date)
  asOf: Date;

  @IsObject()
  @Type(() => AssetsDto)
  assets: AssetsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => BalanceSheetSectionDto)
  liabilities: BalanceSheetSectionDto;

  @IsObject()
  @ValidateNested()
  @Type(() => BalanceSheetSectionDto)
  equity: BalanceSheetSectionDto;

  @IsNumber()
  totalLiabilitiesAndEquity: number;
}
