import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FormulationService } from './formulation.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TenantGuard } from 'src/tenant/guards/tenant.guard';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { FormulationFilterDto } from './dto/formulation-filter.dto';
import { CreateFormulationDto } from './dto/create-formulation.dto';

@UseGuards(JwtAuthGuard)
@UseGuards(TenantGuard)
@Controller('formulations')
export class FormulationController {
  constructor(private readonly formulationService: FormulationService) {}

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Formulations fetched successfully',
  })
  findAll(@Query() filters: FormulationFilterDto) {
    return this.formulationService.findAll(filters);
  }

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Formulation created successfully',
  })
  create(@Body() createFormulationDto: CreateFormulationDto) {
    console.log('createFormulationDto', createFormulationDto);
    return this.formulationService.create(createFormulationDto);
  }

  @Get(':id')
  @ResponseMetadata({
    success: true,
    message: 'Formulation fetched successfully',
  })
  findOne(@Param('id') id: string) {
    return this.formulationService.findOne(id);
  }

  @Put(':id')
  @ResponseMetadata({
    success: true,
    message: 'Formulation updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() updateFormulationDto: CreateFormulationDto,
  ) {
    return this.formulationService.update(id, updateFormulationDto);
  }

  @Delete(':id')
  @ResponseMetadata({
    success: true,
    message: 'Formulation deleted successfully',
  })
  delete(@Param('id') id: string) {
    return this.formulationService.delete(id);
  }
}
