import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ChatMessage } from './memory.types';

@Schema({ timestamps: true })
export class ChatSession extends Document {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({
    type: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'] },
        content: String,
        timestamp: Date,
      },
    ],
    default: [],
  })
  messages: ChatMessage[];

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
