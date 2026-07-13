import { Test, TestingModule } from '@nestjs/testing';
import { AtlassianController } from './atlassian.controller';
import { AtlassianServiceV2 } from './atlassianV2.service';

describe('AtlassianController', () => {
  let controller: AtlassianController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AtlassianController],
      providers: [
        {
          provide: AtlassianServiceV2,
          useValue: {
            getFolderTree: jest.fn(),
            getPageContent: jest.fn(),
            createPage: jest.fn(),
            updatePage: jest.fn(),
            deletePage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AtlassianController>(AtlassianController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
