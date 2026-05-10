import { IsOptional, IsString } from 'class-validator';

// Request DTO for sending a message into the agent loop.
export class SendMessageDto {
  @IsString()
  @IsOptional()
  sessionId: string;

  @IsString()
  message: string;
}
