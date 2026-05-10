export const agentTitlePrompt = (firstMessage: string) => `
Generate a concise, descriptive title for a chat session based on the user's first message.

<rules>
- Maximum 5 words
- Title case only
- No punctuation, quotes, or trailing periods
- Capture the core topic or intent
- Never start with "How to", "Help with", or "Question about"
- Output ONLY the title — no explanation, no preamble
</rules>

<examples>
<example>
<first_message>How do I reset my password?</first_message>
<title>Password Reset Guide</title>
</example>
<example>
<first_message>What's the weather like in New York today?</first_message>
<title>New York Weather Today</title>
</example>
<example>
<first_message>Can you help me plan a trip to Japan?</first_message>
<title>Japan Trip Planning</title>
</example>
<example>
<first_message>I need assistance with my account billing.</first_message>
<title>Account Billing Support</title>
</example>
<example>
<first_message>What are the best practices for remote work?</first_message>
<title>Remote Work Best Practices</title>
</example>
<example>
<first_message>Explain how transformers work in machine learning</first_message>
<title>ML Transformer Architecture</title>
</example>
</examples>

<first_message>${firstMessage}</first_message>
<title>
`.trim();