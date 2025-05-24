import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateBankDto } from './create-bank.dto';

export class UpdateBankDto extends PartialType(
  OmitType(CreateBankDto, ['code'] as const),
) {}
