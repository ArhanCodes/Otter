import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { fortniteFeeds } from '../../db.js';

@ApplyOptions<Command.Options>({
  description: 'Turn a channel into a Fortnite datamining news feed',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('fortnitedatamining')
        .setDescription('Fortnite datamining news feed')
        .addSubcommand((sc) =>
          sc
            .setName('enable')
            .setDescription('Enable Fortnite updates in a channel')
            .addChannelOption((o) =>
              o
                .setName('channel')
                .setDescription('Channel to post updates in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((sc) =>
          sc
            .setName('disable')
            .setDescription('Stop Fortnite updates in a channel')
            .addChannelOption((o) =>
              o
                .setName('channel')
                .setDescription('Channel to stop posting in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((sc) =>
          sc.setName('status').setDescription('Show which channels are receiving Fortnite updates')
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }

    const db = container.db;
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'enable') {
      const channel = interaction.options.getChannel('channel', true);
      fortniteFeeds.add(db, interaction.guildId, channel.id);
      return interaction.reply({
        content: `✅ Fortnite datamining updates will now post in <#${channel.id}>. Updates are checked every 5 minutes.`,
        ephemeral: true
      });
    }

    if (sub === 'disable') {
      const channel = interaction.options.getChannel('channel', true);
      fortniteFeeds.remove(db, interaction.guildId, channel.id);
      return interaction.reply({
        content: `❌ Fortnite updates disabled for <#${channel.id}>.`,
        ephemeral: true
      });
    }

    if (sub === 'status') {
      const feeds = fortniteFeeds.getForGuild(db, interaction.guildId);
      if (feeds.length === 0) {
        return interaction.reply({
          content: 'No Fortnite datamining feeds are set up. Use `/fortnitedatamining enable` to get started.',
          ephemeral: true
        });
      }
      const channels = feeds.map((f) => `<#${f.channel_id}>`).join(', ');
      return interaction.reply({
        content: `📡 Fortnite updates are posting in: ${channels}`,
        ephemeral: true
      });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
}
