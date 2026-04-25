import { Injectable } from '@nestjs/common';
import { NvidiaLlmService } from '../searvices/nvidia-llm.service';
import { FINANCE_SYSTEM_PROMPT } from '../prompts/finance.prompt';
import { FINANCE_TOOLS } from '../tools/tool-registry';
import { AddExpenseExecutor } from '../executors/add-expense.executor';
import { ChatMessage } from '../entities/ai.entity';

@Injectable()
export class FinanceRagAgent {
  constructor(
    private nvidiaLlm: NvidiaLlmService,
    private addExpenseExecutor: AddExpenseExecutor,
  ) {}

  async processMessage(message: string) {
    const systemPrompt = FINANCE_SYSTEM_PROMPT.replace(
      '{date}',
      new Date().toISOString(),
    );

    // STEP 2: Build the conversation history array
    // This array is the ENTIRE memory of this request — it grows as tools are called
    // Every message sent to and received from the LLM gets added here
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }, // who the LLM is
      { role: 'user', content: message }, // what the user typed
    ];

    // STEP 3: First LLM call
    // We send: system prompt + user message + tool definitions (FINANCE_TOOLS)
    // LLM reads the user message and decides:
    //   A) "this looks like an expense" → returns type: 'tool_use' with extracted args
    //   B) "this is not an expense"     → returns type: 'text' with a reply
    let llmResponse = await this.nvidiaLlm.askWithTools(
      messages,
      FINANCE_TOOLS,
    );
    console.log('LLM response after first call:', llmResponse);
    // STEP 4: Safety counter — prevents infinite loop if something goes wrong
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    // STEP 5: The ReAct loop
    // Keeps running as long as LLM wants to call tools
    // For a single expense: runs exactly ONCE then exits
    // For "chai 20, lunch 150, auto 80": runs THREE times (one per expense)
    while (llmResponse.type === 'tool_use') {
      // Break if loop somehow runs too many times — safety net
      if (iterations >= MAX_ITERATIONS) {
        return { status: 'error', data: 'Agent loop exceeded max iterations' };
      }
      iterations++;

      // STEP 6: Read what the LLM decided to call
      // name  = 'add_expense'
      // input = { amount: 450, merchant: 'Dominos', category: 'Food', date: '2026-03-14' }
      // These values were extracted by the LLM from the user's plain text message
      const { name, input } = llmResponse;

      // STEP 7: Execute the tool
      // We run the actual code — call FinanceService to save to MongoDB
      // The LLM does NOT do this — it only told us WHAT to save, we do the actual saving
      let toolResult: any;
      if (name === 'add_expense') {
        toolResult = await this.addExpenseExecutor.execute(input);
        // toolResult = { success: true, id: 'abc123' }
      } else {
        toolResult = { error: `Unknown tool: ${name}` };
      }

      // STEP 8: Tell the LLM what happened
      // We append TWO messages to the conversation history:
      //
      // Message A — "assistant" role with content: null and tool_calls array
      //   This tells the LLM: "you previously made this tool call"
      //   content MUST be null here — if we stringify it, LLM gets confused and loops forever
      //
      // Message B — "tool" role with the result
      //   This tells the LLM: "here is what the tool returned"
      //   tool_call_id links this result to the specific tool call in Message A
      messages.push({
        role: 'assistant',
        content: null, // ✅ must be null — not JSON.stringify
        tool_calls: llmResponse.raw.tool_calls, // ✅ raw array — not stringified
      });
      messages.push({
        role: 'tool',
        content: JSON.stringify(toolResult), // what your code returned after saving
        tool_call_id: llmResponse.raw.tool_calls[0].id, // links result to the tool call above
      });

      // STEP 9: Send full updated history back to LLM
      // LLM now sees: system + user message + its tool call + your tool result
      // It decides: "I saved the expense, I can now give a final answer"
      // → returns type: 'text' → loop exits
      llmResponse = await this.nvidiaLlm.continueWithToolResult(messages);
    } // ← loop exits here when llmResponse.type === 'text'

    // STEP 10: Return final answer to controller → back to Angular
    // e.g. "✅ Saved ₹450 at Dominos (Food)"
    return {
      status: 'success',
      data: llmResponse.content,
    };
  }
}
