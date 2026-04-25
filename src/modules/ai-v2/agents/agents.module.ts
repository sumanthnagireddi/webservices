import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { ContentAgent } from './content/content.agent';
import { BlogAgent } from './blog/blog.agent';
import { InterviewAgent } from './interview/interview.agent';
import { FinanceAgent } from './finance/finance.agent';
import { RagAgent } from './rag/rag.agent';
import { AgenticLlmService } from './agentic.llm.service';
import { NvidiaLangchainLlmService } from './nvidia_langchain_llm.service';

@Module({
  providers: [
    OrchestratorService,
    ContentAgent,
    BlogAgent,
    InterviewAgent,
    FinanceAgent,
    RagAgent,
    AgenticLlmService,
    NvidiaLangchainLlmService
  ],
  exports: [OrchestratorService],
})
export class AgentsModule {}
