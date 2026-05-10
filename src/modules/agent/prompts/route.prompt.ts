// route-prompt.ts

import { ROUTE_REGISTRY } from '../runtime/types/route.types';

const routeDescriptions = Object.entries(ROUTE_REGISTRY)
  .map(([key, val]) => `- "${key}": ${val.description}`)
  .join('\n');

export const buildRoutePrompt = (
  message: string,
  conversationContext?: string,
) =>
  `
You are a routing classifier for an AI agent system. Classify the user message into exactly one route.

<routes>
${routeDescriptions}
</routes>
<disambiguation_rules>
- "fetch", "get", "list", "show", "find", "retrieve", "give me", "what are my" → "data-fetch" or domain-specific fetch (finance-fetch, resource-fetch, snippet-fetch). Never "document-generation"
- "expense", "spent", "paid", "cost", "charge" + action verb → "finance-transaction". Listing expenses → "finance-fetch"
- "create/write/new" + "blog/post/article" → "blog-creation". "edit/update/modify" + "blog/post" → "blog-update"
- "create/add" + "resource/tutorial/guide" → "resource-creation". "find/list" + "resource" → "resource-fetch"
- "save/create" + "snippet/code" → "snippet-creation". "find/list" + "snippet" → "snippet-fetch"
- "generate/export/produce" + "report/pdf/document" (new file) → "document-generation"
- "based on my content", "from my knowledge base", "search my docs" → "rag-query"
- "how", "what", "why", "explain" without data retrieval intent → "question"
- "document-generation" is ONLY for producing a new file that does not exist yet
</disambiguation_rules>

<rules>
- Choose the single most specific matching route
- If the message is ambiguous between two routes, pick the more specific one and lower confidence
- confidence: 0.0–1.0 where 1.0 = perfectly clear intent
- needsClarification: true only if confidence < 0.5
- Output ONLY valid JSON — no explanation, no markdown
</rules>

${conversationContext ? `<recent_context>\n${conversationContext}\n</recent_context>` : ''}

<user_message>${message}</user_message>

Respond with:
{
  "route": "<one of the route keys>",
  "confidence": <number>,
  "reasoning": "<one sentence>",
  "alternativeRoute": "<second best route or null>",
  "needsClarification": <boolean>
}
`.trim();
