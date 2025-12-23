import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TechnologyDocument = Technology & Document;

@Schema({ timestamps: true })
export class Technology {
  @Prop({ required: true,unique:true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

}

export const TechnologySchema =
  SchemaFactory.createForClass(Technology);
