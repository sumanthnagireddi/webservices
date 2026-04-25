import { IsString } from 'class-validator';

// Request DTO for clearing agent memory tied to a session.
export class ResetSessionDto {
  @IsString()
  sessionId: string;
}
