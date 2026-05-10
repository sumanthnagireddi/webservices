import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from '../blogs/blog.schema';
import { RagAgent } from './agents/rag.agent';
import { LlmService } from './searvices/llm.service';
import { VectorService } from './searvices/vector.service';
import { NvidiaLlmService } from './searvices/nvidia-llm.service';
import { FinanceService } from '../finance/finance.service';
import { FinanceRagAgent } from './agents/finance.agent';
import { AddExpenseExecutor } from './executors/add-expense.executor';
import { Finance, FinanceSchema } from '../finance/schema/finance.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: Finance.name, schema: FinanceSchema },
    ]),
  ],
  providers: [
    VectorService,
    LlmService,
    AiService,
    RagAgent,
    NvidiaLlmService,
    FinanceService,
    FinanceRagAgent,
    AddExpenseExecutor,
  ],
  controllers: [AiController],
})
export class AiModule {}
