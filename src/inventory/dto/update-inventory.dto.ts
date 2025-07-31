import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CreateInventoryDto } from './create-inventory.dto';

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;
}
