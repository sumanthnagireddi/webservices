import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentSession, SessionSchema } from './agent_session.schema';
import {
  AgentConversations,
  AgentConversationsSchema,
} from './agent_conversations.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AgentSession.name,
        schema: SessionSchema,
      },
      {
        name: AgentConversations.name,
        schema: AgentConversationsSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class AgentDbModule {}
