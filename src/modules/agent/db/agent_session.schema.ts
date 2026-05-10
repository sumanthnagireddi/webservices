// session.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgentSessionDocument = AgentSession & Document;

@Schema({
  collection: 'sessions',
  timestamps: true,
})
export class AgentSession {
  /* ---------- Ownership ---------- */
  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  sessionId!: string;
  /* ---------- Lifecycle ---------- */
  @Prop({ default: true})
  isActive!: boolean;

  @Prop()
  lastMessageAt?: Date;

  /* ---------- Optional Meta ---------- */
  @Prop({ trim: true })
  title?: string;
}

export const SessionSchema = SchemaFactory.createForClass(AgentSession);