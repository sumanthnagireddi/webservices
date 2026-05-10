#!/usr/bin/env node

/**
 * Lightweight OpenAI + LangChain verification.
 *
 * What it should do:
 * - Load OPENAI_API_KEY and optional OPENAI_MODEL from .env
 * - Call OpenAI through LangChain's ChatOpenAI wrapper
 * - Print a compact result so we can quickly confirm the key works
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, '.env');
const fallbackModel = 'gpt-4o-mini';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function buildClient(model, apiKey) {
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0,
    maxTokens: 40,
    streaming: false,
  });
}

function shouldRetryWithFallback(error, currentModel) {
  if (currentModel === fallbackModel) {
    return false;
  }

  const message = error?.message ?? String(error);
  return /MODEL_NOT_FOUND|does not exist|do not have access/i.test(message);
}

async function verifyModel(model, apiKey) {
  const llm = buildClient(model, apiKey);

  const response = await llm.invoke([
    new SystemMessage(
      'You are a verification assistant. Reply with exactly: OPENAI_OK',
    ),
    new HumanMessage('Return the verification token only.'),
  ]);

  return Array.isArray(response.content)
    ? response.content
        .map((part) => (typeof part === 'string' ? part : part.text ?? ''))
        .join('')
    : response.content;
}

loadEnvFile(envPath);

const apiKey = process.env.OPENAI_API_KEY;
const preferredModel = process.env.OPENAI_MODEL || fallbackModel;

if (!apiKey) {
  console.error('OPENAI_API_KEY is missing from environment.');
  process.exit(1);
}

try {
  let resolvedModel = preferredModel;
  let content;

  try {
    content = await verifyModel(preferredModel, apiKey);
  } catch (error) {
    if (!shouldRetryWithFallback(error, preferredModel)) {
      throw error;
    }

    resolvedModel = fallbackModel;
    content = await verifyModel(fallbackModel, apiKey);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: 'openai',
        model: preferredModel,
        resolvedModel,
        response: content,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        provider: 'openai',
        model: preferredModel,
        message: error?.message ?? 'Unknown OpenAI error',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
