import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AtlassianModule } from '../atlassian/atlassian.module';
import {
  AtlassianContent,
  AtlassianContentSchema,
} from '../atlassian/atlassian-content.schema';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import {
  ContentActivity,
  ContentActivitySchema,
  ContentInteraction,
  ContentInteractionSchema,
  ContentSyncRun,
  ContentSyncRunSchema,
  ContentVersion,
  ContentVersionSchema,
} from './content.schemas';

@Module({
  imports: [
    AtlassianModule,
    MongooseModule.forFeature([
      { name: AtlassianContent.name, schema: AtlassianContentSchema },
      { name: ContentInteraction.name, schema: ContentInteractionSchema },
      { name: ContentVersion.name, schema: ContentVersionSchema },
      { name: ContentSyncRun.name, schema: ContentSyncRunSchema },
      { name: ContentActivity.name, schema: ContentActivitySchema },
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
