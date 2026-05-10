// message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum MessageStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  DONE = 'done',
  ERROR = 'error',
}

export type MessageDocument = AgentConversations & Document;

@Schema({
  collection: 'messages',
  timestamps: true,
})
export class AgentConversations {
  /* ---------- Relationship ---------- */
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId!: Types.ObjectId;

  @Prop({ index: true })
  userId?: string;

  /* ---------- Core ---------- */
  @Prop({
    type: String,
    enum: MessageRole,
    required: true,
    index: true,
  })
  role!: MessageRole;

  @Prop({ required: true })
  content!: string;

  /* ---------- Status ---------- */
  @Prop({
    type: String,
    enum: MessageStatus,
    default: MessageStatus.DONE,
  })
  status!: MessageStatus;

  /* ---------- Ordering ---------- */
  @Prop({ required: true })
  sequenceNumber!: number; // 1, 2, 3... per session, for reliable ordering

  /* ---------- Token Tracking ---------- */
  @Prop()
  inputTokens?: number;

  @Prop()
  outputTokens?: number;

  /* ---------- Error Capture ---------- */
  @Prop()
  errorMessage?: string;
}

export const AgentConversationsSchema =
  SchemaFactory.createForClass(AgentConversations);

// Fetch all messages in a session in order — your most common query
AgentConversationsSchema.index({ sessionId: 1, sequenceNumber: 1 });
