#!/usr/bin/env node

import axios from 'axios';

const baseUrl = process.env.API_URL || 'http://localhost:3000';
const message =
  process.argv.slice(2).join(' ') ||
  'Explain what this agent can do in two short sentences.';
const sessionId = process.env.AGENT_SESSION_ID;

async function main() {
  try {
    const payload = sessionId ? { sessionId, message } : { message };
    const response = await axios.post(`${baseUrl}/agent/message`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Agent flow test failed.');

    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status ?? 'no-response'}`);
      console.error(
        JSON.stringify(error.response?.data ?? { message: error.message }, null, 2),
      );
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();
