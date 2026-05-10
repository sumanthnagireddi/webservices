import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { AtlassianService } from './atlassian.service';
import { AtlassianContent } from './atlassian-content.schema';
import { AtlassianFolder } from './atlassian-folder.schema';
import { NotificationsService } from '../notifications/notifications.service';

describe('AtlassianService', () => {
  let service: AtlassianService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtlassianService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: {
            publishSuccess: jest.fn(),
            publishInfo: jest.fn(),
            publishError: jest.fn(),
          },
        },
        {
          provide: getModelToken(AtlassianContent.name),
          useValue: {
            findOneAndUpdate: jest.fn(),
            bulkWrite: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(AtlassianFolder.name),
          useValue: {
            find: jest.fn(),
            bulkWrite: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AtlassianService>(AtlassianService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should ignore empty children when merging trees', () => {
    const merged = service.mergeChildren(undefined, undefined);

    expect(merged).toEqual([]);
  });
});
