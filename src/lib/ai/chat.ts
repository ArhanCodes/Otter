import OpenAI from 'openai';
import { env } from '../../env.js';
import type { AiConfig, AiMessage } from '../../db.js';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: env.AI_BASE_URL
    });
  }
  return client;
}

export interface ChatContext {
  config: AiConfig;
  history: AiMessage[];
  userName: string;
  serverName: string;
  channelName: string;
}

export async function generateResponse(ctx: ChatContext): Promise<string> {
  const ai = getClient();

  const systemPrompt = ctx.config.system_prompt || env.AI_SYSTEM_PROMPT;
  const model = ctx.config.model || env.AI_MODEL;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt
        .replaceAll('{{SERVER_NAME}}', ctx.serverName)
        .replaceAll('{{CHANNEL_NAME}}', ctx.channelName)
        .replaceAll('{{USER_NAME}}', ctx.userName)
    },
    ...ctx.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
  ];

  const completion = await ai.chat.completions.create({
    model,
    messages,
    max_tokens: 2000
  });

  return completion.choices[0]?.message?.content ?? 'I had trouble generating a response.';
}

/**
 * Split a long response into Discord-friendly chunks (max 2000 chars).
 * Tries to split at sentence boundaries, and extracts large code blocks as attachments.
 */
export function splitMessage(text: string, maxLen = 1900): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a double newline, then single newline, then sentence end
    let splitIdx = -1;
    const searchRange = remaining.slice(0, maxLen);

    for (const sep of ['\n\n', '\n', '. ', '! ', '? ']) {
      const idx = searchRange.lastIndexOf(sep);
      if (idx > maxLen * 0.3) {
        splitIdx = idx + sep.length;
        break;
      }
    }

    if (splitIdx === -1) splitIdx = maxLen;

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx);
  }

  return chunks;
}
