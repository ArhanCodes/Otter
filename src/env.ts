import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  OWNERS: z.string().optional().default(''),
  DB_PATH: z.string().optional().default('./data/bot.sqlite'),
  DEFAULT_PREFIX: z.string().optional().default('!'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional().default('info'),

  // AI Chat
  AI_API_KEY: z.string().optional().default('ollama'),
  AI_BASE_URL: z.string().optional().default('http://host.docker.internal:11434/v1'),
  AI_MODEL: z.string().optional().default('llama3.2:3b'),
  AI_SYSTEM_PROMPT: z.string().optional().default('You are Otter, a friendly and helpful Discord bot. Keep responses concise and conversational. Use markdown formatting when appropriate.')
});

export const env = schema.parse(process.env);

export function ownersList(): string[] {
  return env.OWNERS.split(',').map((s) => s.trim()).filter(Boolean);
}
