import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Formulation } from './entity/formulation.entity';
import { Repository } from 'typeorm';
import { CreateFormulationDto } from './dto/create-formulation.dto';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { UpdateFormulationDto } from './dto/update-formulation.dto';

@Injectable()
export class FormulationService {
  constructor(
    @InjectRepository(Formulation)
    private formulationRepository: Repository<Formulation>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findAll(filters: Record<string, any>): Promise<Paginated<Formulation>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.formulationRepository
      .createQueryBuilder('formulation')
      .leftJoinAndSelect('formulation.tenant', 'tenant')
      .where('formulation.tenant.id = :tenantId', { tenantId });

    const { page, limit, ...filterFields } = filters;
    const ALLOWED_FILTERS = ['name'];

    Object.entries(filterFields).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`formulation.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    const paginated = await paginate(queryBuilder, page, limit);
    return paginated;
  }

  async findOne(id: string): Promise<Formulation> {
    const formulation = await this.formulationRepository.findOne({
      where: { id },
    });
    if (!formulation)
      throw new NotFoundException(`Formulation with ID ${id} not found`);
    return formulation;
  }

  async create(
    createFormulationDto: CreateFormulationDto,
  ): Promise<Formulation> {
    const tenantId = this.tenantContextService.getTenantId();
    if (!createFormulationDto.name) {
      createFormulationDto.name = createFormulationDto.products[0].name;
    }
    const formulation = this.formulationRepository.create({
      ...createFormulationDto,
      tenant: { id: tenantId },
    });
    return await this.formulationRepository.save(formulation);
  }

  async update(id: string, updateFormulationDto: UpdateFormulationDto) {
    const formulation = await this.formulationRepository.findOne({
      where: { id },
    });

    if (!formulation)
      throw new NotFoundException(`Formulation with ID ${id} not found`);
    Object.assign(formulation, updateFormulationDto);
    return await this.formulationRepository.save(formulation);
  }

  async delete(id: string) {
    const formulation = await this.formulationRepository.findOne({
      where: { id },
    });
    if (!formulation)
      throw new NotFoundException(`Formulation with ID ${id} not found`);
    return await this.formulationRepository.remove(formulation);
  }
}
