import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
export type TopicDocument = Topics & Document;
@Schema({ collection: 'topics' })
export class Topics {
  @Prop({ type: Types.ObjectId, ref: 'Technology', required: true })
  technologyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;
  
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const TopicSchema = SchemaFactory.createForClass(Topics);
