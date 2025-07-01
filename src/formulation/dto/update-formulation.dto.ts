import { PartialType } from '@nestjs/mapped-types';
import { CreateFormulationDto } from './create-formulation.dto';

export class UpdateFormulationDto extends PartialType(CreateFormulationDto) {}
