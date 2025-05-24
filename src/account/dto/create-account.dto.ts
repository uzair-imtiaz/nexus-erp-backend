import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { AccountType } from '../interfaces/account-type.enum';
import { Transform } from 'class-transformer';

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
  debitAmount?: number;

  @IsNumber()
  @IsOptional()
  creditAmount?: number;

  @ValidateIf((o) => o.type === AccountType.SUB_ACCOUNT)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    value !== null && value !== undefined ? String(value) : value,
  )
  entityId?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : value,
  )
  parentId?: number;

  @IsOptional()
  @IsBoolean()
  systemGenerated?: boolean;
}
