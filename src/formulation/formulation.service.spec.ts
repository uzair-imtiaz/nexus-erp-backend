import { Test, TestingModule } from '@nestjs/testing';
import { FormulationService } from './formulation.service';

describe('FormulationService', () => {
  let service: FormulationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormulationService],
    }).compile();

    service = module.get<FormulationService>(FormulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
