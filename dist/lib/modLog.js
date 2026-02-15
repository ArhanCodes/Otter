import { EmbedBuilder, Colors } from 'discord.js';
import { guildSettings } from '../db.js';
export async function sendModLog(opts) {
    const settings = guildSettings.get(opts.db, opts.guild.id);
    const channelId = settings.mod_log_channel_id;
    if (!channelId)
        return;
    const channel = (await opts.guild.channels.fetch(channelId).catch(() => null));
    if (!channel || !('send' in channel))
        return;
    const embed = new EmbedBuilder()
        .setTitle(opts.title)
        .setDescription(opts.description)
        .setColor((opts.color ?? Colors.Blurple))
        .setTimestamp(new Date());
    if (opts.fields?.length)
        embed.addFields(opts.fields);
    await channel.send({ embeds: [embed] });
}
export function memberTag(member) {
    return `${member.user.username} (${member.id})`;
}
//# sourceMappingURL=modLog.js.map