import { Test, TestingModule } from '@nestjs/testing';
import { StrategoService } from './stratego.service';

describe('StrategoService', () => {
  let service: StrategoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrategoService],
    }).compile();

    service = module.get<StrategoService>(StrategoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
