import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export interface AiProvider {
  name: string;
  model: LanguageModel;
}

export const AI_PROVIDERS: AiProvider[] = [
  { name: 'gemini',     model: google('gemini-2.0-flash') },
  { name: 'openrouter', model: openrouter('meta-llama/llama-4-scout:free') },
  { name: 'groq',       model: groq('llama-3.3-70b-versatile') },
  { name: 'deepseek',   model: openrouter('deepseek/deepseek-chat-v3-0324:free') },
];

// Provider primario con visión (Gemini)
export const VISION_PROVIDER = AI_PROVIDERS[0];

// Provider para streaming de chat (Gemini primero)
export const CHAT_PROVIDER = AI_PROVIDERS[0];
