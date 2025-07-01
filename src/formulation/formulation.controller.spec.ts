import { Test, TestingModule } from '@nestjs/testing';
import { FormulationController } from './formulation.controller';
import { FormulationService } from './formulation.service';

describe('FormulationController', () => {
  let controller: FormulationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormulationController],
      providers: [FormulationService],
    }).compile();

    controller = module.get<FormulationController>(FormulationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
