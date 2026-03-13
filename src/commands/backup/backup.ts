import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { container } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  description: 'Export bot config as a JSON file',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('backup')
        .setDescription('Backup/export bot config')
        .addSubcommand((sc) => sc.setName('export').setDescription('Export config + ticket setup + role menus'))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const settings = container.db.prepare('SELECT * FROM guild_settings WHERE guild_id=?').get(interaction.guildId);
    const ticket = container.db.prepare('SELECT * FROM ticket_config WHERE guild_id=?').get(interaction.guildId);
    const roleMenus = container.db.prepare('SELECT * FROM role_menus WHERE guild_id=?').all(interaction.guildId);

    const payload = {
      exportedAt: new Date().toISOString(),
      guildId: interaction.guildId,
      guildSettings: settings,
      ticketConfig: ticket,
      roleMenus
    };

    const file = new AttachmentBuilder(Buffer.from(JSON.stringify(payload, null, 2), 'utf8'), {
      name: `otter-backup-${interaction.guildId}.json`
    });

    return interaction.reply({ content: 'Backup exported:', files: [file], ephemeral: true });
  }
}
