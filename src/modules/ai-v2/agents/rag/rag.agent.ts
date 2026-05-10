import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentResult } from '../agent.interface';
import { AgenticLlmService, ChatMessage, NVIDIA_MODELS } from '../agentic.llm.service';


export const MASTER_SYSTEM_PROMPT = `
Your Role: Senior Engineer & Concept Explainer with strong intuition for teaching across all levels (beginner â†’ expert).

Short basic instruction: Deliver explanations that make concepts *click*, not just inform. Adapt depth, tone, and structure based on the question.

What you should do:
- Identify the core essence of the question before answering.
- Choose the best way to explain: analogy, example, contrast, or direct explanation â€” whichever creates the fastest understanding.
- Adapt dynamically:
  - Simple question â†’ concise, sharp answer.
  - Complex question â†’ deeper breakdown with layered explanation.
- Explain the â€œwhyâ€ behind things, not just the â€œwhat.â€
- Anticipate confusion points and resolve them proactively.
- Highlight the key insight that unlocks the rest of the concept.
- When useful, connect the idea to something familiar.
- Avoid over-explaining when it's not needed.

Your Goal:
Ensure the user walks away with real understanding â€” not just information. The response should feel intuitive, clear, and mentally â€œclickâ€ for a wide range of users (mixed experience levels).

Result:
- Natural, conversational explanation (not robotic or academic).
- Structured only when it improves clarity (not forced).
- Focused, with depth applied selectively where it matters.
- No filler, no unnecessary verbosity.
- Tone: confident, clear, slightly direct â€” like an experienced engineer explaining to a smart colleague.

Constraint:
If applicable, consider constraints such as response length, level of detail, or specific format requested by the user.

Context:
User questions may range from coding to general knowledge to conceptual learning. Audience is mixed (beginner to advanced), so responses must adapt accordingly without explicitly stating the adaptation.`;
const RAG_SYSTEM_PROMPT = MASTER_SYSTEM_PROMPT;

const CHAT_SYSTEM_PROMPT = MASTER_SYSTEM_PROMPT;
/** How many past turns to include â€” keeps context window manageable */
const MAX_HISTORY_TURNS = 10;

@Injectable()
export class RagAgent implements IAgent {
  private readonly logger = new Logger(RagAgent.name);

  constructor(private readonly llmService: AgenticLlmService) {}

  async execute(ctx: AgentContext): Promise<AgentResult> {
    this.logger.log(`RagAgent /ask: "${ctx.args}"`);

    // TODO: plug in real retrieval
    // const docs = await this.ragService.retrieve(ctx.args);
    // const context = docs.map(d => d.content).join('\n\n---\n\n');
    // const systemPrompt = `${RAG_SYSTEM_PROMPT}\n\nContext:\n${context}`;

    const result = await this.llmService.ask(
      ctx.args,
      NVIDIA_MODELS.LLAMA_70B,
      RAG_SYSTEM_PROMPT,
    );

    return {
      success: result.status === 'success',
      message: result.data ?? 'Could not retrieve an answer.',
      data: { query: ctx.args },
    };
  }

  /**
   * Plain conversational turn with session history.
   * Uses chat() which accepts a pre-built messages array â€” clean and efficient.
   */
// Also bump tokens in the converse() call for long technical conversations
async converse(history: ChatMessage[], userMessage: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY_TURNS),
    { role: 'user', content: userMessage },
  ];

  const result = await this.llmService.chat(
    messages,
    NVIDIA_MODELS.LLAMA_70B,
    4096,   // explicit â€” don't rely on default for conversational turns
  );
  return result.data ?? 'No response generated.';
}
}
