import type { ChatInputCommandInteraction, Guild, GuildMember, TextBasedChannel } from 'discord.js';
import { EmbedBuilder, Colors } from 'discord.js';
import type { Db } from '../db.js';
import { guildSettings } from '../db.js';

export async function sendModLog(opts: {
  db: Db;
  guild: Guild;
  title: string;
  description: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}) {
  const settings = guildSettings.get(opts.db, opts.guild.id);
  const channelId = settings.mod_log_channel_id as string | null;
  if (!channelId) return;

  const channel = (await opts.guild.channels.fetch(channelId).catch(() => null)) as TextBasedChannel | null;
  if (!channel || !('send' in channel)) return;

  const embed = new EmbedBuilder()
    .setTitle(opts.title)
    .setDescription(opts.description)
    .setColor((opts.color ?? Colors.Blurple) as any)
    .setTimestamp(new Date());

  if (opts.fields?.length) embed.addFields(opts.fields);

  await channel.send({ embeds: [embed] });
}

export function memberTag(member: GuildMember) {
  return `${member.user.username} (${member.id})`;
}
