import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession } from './memory.schema';
import { ChatMessage, SessionContext } from './memory.types';

@Injectable()
export class MemoryService {
  constructor(
    @InjectModel(ChatSession.name)
    private readonly chatSessionModel: Model<ChatSession>,
  ) {}

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.chatSessionModel.findOne({ sessionId }).lean();
    return session?.messages ?? [];
  }

  async appendMessage(
    sessionId: string,
    userId: string,
    message: ChatMessage,
  ): Promise<void> {
    await this.chatSessionModel.findOneAndUpdate(
      { sessionId },
      {
        $push: { messages: message },
        $set: { userId, updatedAt: new Date() },
      },
      { upsert: true, new: true },
    );
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.chatSessionModel.deleteOne({ sessionId });
  }

  async getSessionContext(
    sessionId: string,
    userId: string,
  ): Promise<SessionContext> {
    const session = await this.chatSessionModel.findOne({ sessionId }).lean();
    return {
      sessionId,
      userId,
      messages: session?.messages ?? [],
      updatedAt: session?.updatedAt ?? new Date(),
    };
  }
}
