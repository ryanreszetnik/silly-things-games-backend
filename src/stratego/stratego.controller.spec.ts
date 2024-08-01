import { Test, TestingModule } from '@nestjs/testing';
import { StrategoController } from './stratego.controller';

describe('StrategoController', () => {
  let controller: StrategoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrategoController],
    }).compile();

    controller = module.get<StrategoController>(StrategoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
