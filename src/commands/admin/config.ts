import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { guildSettings } from '../../db.js';

@ApplyOptions<Command.Options>({
  description: 'Configure the bot for this server',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('config')
        .setDescription('Configure the bot')
        .addSubcommand((sc) =>
          sc
            .setName('modlog')
            .setDescription('Set the moderation log channel')
            .addChannelOption((o) => o.setName('channel').setDescription('Channel to post moderation logs').setRequired(true))
        )
        .addSubcommand((sc) =>
          sc
            .setName('muterole')
            .setDescription('Set the mute role (used by /mute)')
            .addRoleOption((o) => o.setName('role').setDescription('Role to use as mute').setRequired(true))
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const db = container.db;

    const sub = interaction.options.getSubcommand(true);
    if (sub === 'modlog') {
      const channel = interaction.options.getChannel('channel', true);
      guildSettings.setModLogChannel(db, interaction.guildId, channel.id);
      return interaction.reply({ content: `Mod log channel set to <#${channel.id}>`, ephemeral: true });
    }

    if (sub === 'muterole') {
      const role = interaction.options.getRole('role', true);
      guildSettings.setMuteRole(db, interaction.guildId, role.id);
      return interaction.reply({ content: `Mute role set to <@&${role.id}>`, ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
  }
}
