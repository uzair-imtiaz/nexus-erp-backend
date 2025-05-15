import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateIf,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { AccountType } from '../interfaces/account-type.enum';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsEnum(AccountType)
  type: AccountType;

  @ValidateIf((o) => o.type === AccountType.SUB_ACCOUNT)
  @IsNotEmpty()
  @IsString()
  entityType?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @ValidateIf((o) => o.type === AccountType.SUB_ACCOUNT)
  @IsNotEmpty()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  systemGenerated?: boolean;
}
