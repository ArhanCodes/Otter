import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import { container } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  description: 'Ticket system (setup + panel)',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ticket')
        .setDescription('Ticket system')
        .addSubcommand((sc) =>
          sc
            .setName('setup')
            .setDescription('Configure tickets')
            .addChannelOption((o) =>
              o
                .setName('category')
                .setDescription('Category where tickets will be created')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
            )
            .addRoleOption((o) => o.setName('support_role').setDescription('Support role that can see tickets').setRequired(true))
        )
        .addSubcommand((sc) => sc.setName('panel').setDescription('Post a ticket panel button'))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'setup') {
      const category = interaction.options.getChannel('category', true);
      const supportRole = interaction.options.getRole('support_role', true);

      container.db
        .prepare(
          `INSERT INTO ticket_config (guild_id, category_id, support_role_id)
           VALUES (?, ?, ?)
           ON CONFLICT(guild_id) DO UPDATE SET category_id=excluded.category_id, support_role_id=excluded.support_role_id`
        )
        .run(interaction.guildId, category.id, supportRole.id);

      return interaction.reply({ content: 'Ticket system configured.', ephemeral: true });
    }

    if (sub === 'panel') {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('ticket:open').setLabel('Open Ticket').setStyle(ButtonStyle.Primary)
      );

      const msg = await interaction.channel?.send({
        content: '**Support tickets**\nClick the button to open a private ticket channel.',
        components: [row]
      });

      if (msg) {
        container.db
          .prepare(
            `INSERT INTO ticket_config (guild_id, panel_channel_id, panel_message_id)
             VALUES (?, ?, ?)
             ON CONFLICT(guild_id) DO UPDATE SET panel_channel_id=excluded.panel_channel_id, panel_message_id=excluded.panel_message_id`
          )
          .run(interaction.guildId, interaction.channelId, msg.id);
      }

      return interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
}
