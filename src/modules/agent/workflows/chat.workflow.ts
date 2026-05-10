import { Injectable } from '@nestjs/common';

// Chat workflow is the default conversational path for general-purpose agent
// requests before you add more specialized workflows.
@Injectable()
export class ChatWorkflow {
  readonly name = 'chat';
}
