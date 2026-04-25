import { Injectable } from '@nestjs/common';

@Injectable()
export class ConversationsService {
  listConversations() {
    return [
      { sessionId: 'session-1', lastMessage: 'Hello, how can I help you?' },
      {
        sessionId: 'session-2',
        lastMessage: 'What is the weather like today?',
      },
    ];
  }

  async addToConversation(sessionId: string, message: string, response: string) {
    console.log(`Adding message to conversation ${sessionId}: ${message}`);
    console.log(`Adding response to conversation ${sessionId}: ${response}`);
  }
  getConversationById(sessionId: string) {
    // In a real implementation, this would fetch from a database or in-memory store.
    return {
      sessionId,
      messages: [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'agent', content: 'I am good, thank you!' },
      ],
    };
  }
  deleteConversation(sessionId: string) {
    // In a real implementation, this would delete from a database or in-memory store.
    console.log(`Deleting conversation ${sessionId}`);
  }
  
}
