import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  OWNERS: z.string().optional().default(''),
  DB_PATH: z.string().optional().default('./data/bot.sqlite'),
  DEFAULT_PREFIX: z.string().optional().default('!'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional().default('info')
});

export const env = schema.parse(process.env);

export function ownersList(): string[] {
  return env.OWNERS.split(',').map((s) => s.trim()).filter(Boolean);
}
