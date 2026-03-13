import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { guildSettings, infractions } from '../../db.js';
import { sendModLog } from '../../lib/modLog.js';

@ApplyOptions<Command.Options>({
  description: 'Mute a member (adds a configured mute role)',
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('mute')
        .setDescription('Mute a member (requires /config muterole)')
        .addUserOption((o) => o.setName('user').setDescription('User to mute').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason');

    const settings = guildSettings.get(container.db, interaction.guildId);
    const muteRoleId = settings.mute_role_id as string | null;
    if (!muteRoleId) return interaction.reply({ content: 'Mute role not set. Run `/config muterole` first.', ephemeral: true });

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not in this guild.', ephemeral: true });

    await member.roles.add(muteRoleId, reason ?? undefined);

    infractions.add(container.db, { guildId: interaction.guildId, userId: user.id, modId: interaction.user.id, type: 'mute', reason });

    await sendModLog({
      db: container.db,
      guild: interaction.guild,
      title: 'Member muted',
      description: `${user.tag} was muted by ${interaction.user.tag}`,
      fields: reason ? [{ name: 'Reason', value: reason }] : undefined
    });

    return interaction.reply({ content: `Muted **${user.tag}**`, ephemeral: true });
  }
}
