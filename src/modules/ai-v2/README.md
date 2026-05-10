# Agentic Chatbot Feature

A NestJS chatbot module with shortcut-triggered agents and session memory.

## Folder Structure

```
src/
├── memory/           # Global session memory (MongoDB-backed)
├── chatbot/          # HTTP controller + shortcut parser
└── agents/           # Orchestrator + 5 specialized agents
    ├── finance/      # /expense → extract & save expense
    ├── content/      # /generate → AI content draft
    ├── blog/         # /blog → AI blog post draft
    ├── interview/    # /interview → Q&A generation
    └── rag/          # /ask + plain chat via RAG
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chatbot/message` | Send a message (supports shortcuts) |
| POST | `/chatbot/reset` | Clear session history |

## Request Body — `/chatbot/message`

```json
{
  "sessionId": "user-abc-session-1",
  "message": "/expense $45 lunch with client",
  "userId": "user-abc"
}
```

## Shortcut Commands

| Command | Example | Agent |
|---------|---------|-------|
| `/generate` | `/generate React hooks tutorial` | ContentAgent |
| `/blog` | `/blog Why TypeScript matters` | BlogAgent |
| `/interview` | `/interview NestJS advanced` | InterviewAgent |
| `/expense` | `/expense $45 dinner` | FinanceAgent |
| `/ask` | `/ask what is dependency injection` | RagAgent |

## Wiring to Real Services

Each agent file has commented-out code showing exactly where to inject and call:
- `LlmService` (from your existing `ai/` module)
- Domain services: `ContentService`, `BlogService`, `FinanceService`, `InterviewBankService`, `RagService`

## Implementation Order

1. Add `MemoryModule` to `app.module.ts` (it's `@Global()`)
2. Add `AgentsModule` and `ChatbotModule` to `app.module.ts`
3. Wire `LlmService` into agents (uncomment injected calls)
4. Wire domain services one agent at a time, starting with `FinanceAgent`
5. Expose `callWithMessages(history[])` on your existing `LlmService`
