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
import { EntityType } from 'src/common/enums/entity-type.enum';

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
  @IsEnum(EntityType)
  entityType?: EntityType;

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
