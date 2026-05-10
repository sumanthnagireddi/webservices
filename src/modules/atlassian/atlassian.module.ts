import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { AtlassianService } from './atlassian.service';
import { AtlassianController } from './atlassian.controller';
import {
  AtlassianContent,
  AtlassianContentSchema,
} from './atlassian-content.schema';
import {
  AtlassianFolder,
  AtlassianFolderSchema,
} from './atlassian-folder.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: AtlassianContent.name, schema: AtlassianContentSchema },
      { name: AtlassianFolder.name, schema: AtlassianFolderSchema },
    ]),
  ],
  providers: [AtlassianService],
  controllers: [AtlassianController],
  exports: [AtlassianService],
})
export class AtlassianModule {}
