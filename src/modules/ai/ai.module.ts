import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from '../blogs/blog.schema';
import { Content, ContentSchema } from '../content/content.schema';
import { Technology, TechnologySchema } from '../technolgoies/technologies.schema';
import { RagAgent } from './agents/rag.agent';
import { LlmService } from './searvices/llm.service';
import { VectorService } from './searvices/vector.service';
import { NvidiaLlmService } from './searvices/nvidia-llm.service';

@Module({
   imports: [
     ConfigModule,
     MongooseModule.forFeature([
       { name: Content.name, schema: ContentSchema },
       { name: Blog.name, schema: BlogSchema },
       { name: Technology.name, schema: TechnologySchema },
     ]),
   ],
   providers: [
     VectorService,
     LlmService,
     AiService,
     RagAgent,
     NvidiaLlmService
   ],
   controllers: [AiController],
})
export class AiModule {}
