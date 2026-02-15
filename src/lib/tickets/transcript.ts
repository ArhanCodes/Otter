import type { TextChannel } from 'discord.js';

export async function buildTranscript(channel: TextChannel, limit = 100): Promise<string> {
  const messages = await channel.messages.fetch({ limit });
  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = sorted.map((m) => {
    const ts = new Date(m.createdTimestamp).toISOString();
    const author = `${m.author.username}#${m.author.discriminator}`;
    const content = (m.content || '').replace(/\n/g, '\\n');
    return `[${ts}] ${author}: ${content}`;
  });

  return `TICKET TRANSCRIPT\nChannel: #${channel.name}\nGenerated: ${new Date().toISOString()}\n\n${lines.join('\n')}`;
}
