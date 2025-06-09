import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryDto } from './create-inventory.dto';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
