import { Test, TestingModule } from '@nestjs/testing';
import { AtlassianController } from './atlassian.controller';
import { AtlassianService } from './atlassian.service';

describe('AtlassianController', () => {
  let controller: AtlassianController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AtlassianController],
      providers: [
        {
          provide: AtlassianService,
          useValue: {
            getAllPages: jest.fn(),
            getFolderHierarchy: jest.fn(),
            getStoredFolders: jest.fn(),
            getPageById: jest.fn(),
            upsertContent: jest.fn(),
            bulkUpsertContent: jest.fn(),
            getStoredContents: jest.fn(),
            getStoredContentByAtlassianId: jest.fn(),
            triggerPageContentSync: jest.fn(),
            triggerFolderSync: jest.fn(),
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
