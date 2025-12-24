import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TestDocument = Test & Document;

@Schema({ collection: 'test' })
export class Test {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  slug: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const TestSchema = SchemaFactory.createForClass(Test);
