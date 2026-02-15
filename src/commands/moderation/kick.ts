import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { infractions } from '../../db.js';
import { sendModLog } from '../../lib/modLog.js';

@ApplyOptions<Command.Options>({
  description: 'Kick a member',
  requiredUserPermissions: [PermissionFlagsBits.KickMembers]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('kick')
        .setDescription('Kick a member')
        .addUserOption((o) => o.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not in this guild.', ephemeral: true });

    await member.kick(reason ?? undefined);

    infractions.add(container.db, { guildId: interaction.guildId, userId: user.id, modId: interaction.user.id, type: 'kick', reason });

    await sendModLog({
      db: container.db,
      guild: interaction.guild,
      title: 'Member kicked',
      description: `${user.tag} was kicked by ${interaction.user.tag}`,
      fields: reason ? [{ name: 'Reason', value: reason }] : undefined
    });

    return interaction.reply({ content: `Kicked **${user.tag}**`, ephemeral: true });
  }
}
