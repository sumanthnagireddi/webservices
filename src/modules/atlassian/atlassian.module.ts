import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { AtlassianController } from './atlassian.controller';
import {
  AtlassianContent,
  AtlassianContentSchema,
} from './atlassian-content.schema';
import {
  AtlassianFolder,
  AtlassianFolderSchema,
} from './atlassian-folder.schema';
import {
  ContentVersion,
  ContentVersionSchema,
} from '../content/content.schemas';
import { ConfluenceSyncCron } from './atlassian-cron.service';
import {
  ConfluenceFolder,
  ConfluenceFolderSchema,
  ConfluencePage,
  ConfluencePageSchema,
  SyncMeta,
  SyncMetaSchema,
} from './atlassian-sync.schemas';
import { AtlassianServiceV2 } from './atlassianV2.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: AtlassianContent.name, schema: AtlassianContentSchema },
      { name: AtlassianFolder.name, schema: AtlassianFolderSchema },
      { name: ContentVersion.name, schema: ContentVersionSchema },
      { name: ConfluencePage.name, schema: ConfluencePageSchema },
      { name: ConfluenceFolder.name, schema: ConfluenceFolderSchema },
      { name: SyncMeta.name, schema: SyncMetaSchema },
    ]),
  ],
  providers: [AtlassianServiceV2, ConfluenceSyncCron],
  controllers: [AtlassianController],
  exports: [AtlassianServiceV2],
})
export class AtlassianModule {}
