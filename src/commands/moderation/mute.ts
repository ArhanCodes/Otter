import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { infractions } from '../../db.js';
import { sendModLog } from '../../lib/modLog.js';

@ApplyOptions<Command.Options>({
  description: 'Timeout a member using Discord timeout',
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('mute')
        .setDescription('Timeout a member')
        .addUserOption((o) => o.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption((o) =>
          o
            .setName('duration')
            .setDescription('Duration in minutes (default: 5)')
            .setMinValue(1)
            .setMaxValue(40320)
            .setRequired(false)
        )
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const durationMinutes = interaction.options.getInteger('duration') ?? 5;
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not in this guild.', ephemeral: true });

    const durationMs = durationMinutes * 60 * 1000;
    await member.timeout(durationMs, reason ?? undefined);

    infractions.add(container.db, { guildId: interaction.guildId, userId: user.id, modId: interaction.user.id, type: 'timeout', reason });

    await sendModLog({
      db: container.db,
      guild: interaction.guild,
      title: 'Member timed out',
      description: `${user.tag} was timed out by ${interaction.user.tag}`,
      fields: [
        { name: 'Duration', value: `${durationMinutes} minute${durationMinutes === 1 ? '' : 's'}`, inline: true },
        ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : [])
      ]
    });

    return interaction.reply({ content: `Timed out **${user.tag}** for ${durationMinutes} minute${durationMinutes === 1 ? '' : 's'}`, ephemeral: true });
  }
}
