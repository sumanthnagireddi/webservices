import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'refreshtokens', timestamps: true })
export class RefreshToken extends Document {
  @Prop()
  userId: string;

  @Prop()
  refreshToken: string;

  @Prop()
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
