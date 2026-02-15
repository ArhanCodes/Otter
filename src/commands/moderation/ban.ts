import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { infractions } from '../../db.js';
import { sendModLog } from '../../lib/modLog.js';

@ApplyOptions<Command.Options>({
  description: 'Ban a user',
  requiredUserPermissions: [PermissionFlagsBits.BanMembers]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ban')
        .setDescription('Ban a user')
        .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
        .addIntegerOption((o) => o.setName('delete_days').setDescription('Delete message history (0-7 days)').setMinValue(0).setMaxValue(7))
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
    const reason = interaction.options.getString('reason');

    await interaction.guild.members.ban(user.id, { deleteMessageSeconds: deleteDays * 24 * 60 * 60, reason: reason ?? undefined });

    infractions.add(container.db, { guildId: interaction.guildId, userId: user.id, modId: interaction.user.id, type: 'ban', reason });

    await sendModLog({
      db: container.db,
      guild: interaction.guild,
      title: 'User banned',
      description: `${user.tag} was banned by ${interaction.user.tag}`,
      fields: [
        { name: 'Delete days', value: String(deleteDays), inline: true },
        ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : [])
      ]
    });

    return interaction.reply({ content: `Banned **${user.tag}**`, ephemeral: true });
  }
}
