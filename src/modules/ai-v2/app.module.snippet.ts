// app.module.ts — add these imports to your existing AppModule

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ── Existing modules (keep yours) ──────────────────────────────────────────
// import { AuthModule } from './auth/auth.module';
// import { AiModule } from './ai/ai.module';
// ... etc

// ── New agentic modules ────────────────────────────────────────────────────
import { MemoryModule } from './memory/memory.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),

    // Register MemoryModule FIRST — it is @Global() and required by ChatbotService
    MemoryModule,

    // Agents must come before Chatbot (ChatbotModule imports AgentsModule)
    AgentsModule,
    ChatbotModule,

    // ... your existing modules
    // AuthModule,
    // AiModule,
  ],
})
export class AppModule {}
