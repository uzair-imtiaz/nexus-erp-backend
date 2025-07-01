import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class FormulationFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;
}
