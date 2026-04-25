import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class MessageDto {
  @IsString()
  @IsOptional()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class ResetSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
