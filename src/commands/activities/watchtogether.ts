import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, type VoiceChannel } from 'discord.js';

const WATCH_TOGETHER_ID = '880218394199220334';

@ApplyOptions<Command.Options>({
  description: 'Start a Watch Together (YouTube) session in a voice channel'
})
export class WatchTogetherCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('watchtogether')
        .setDescription('Start a Watch Together (YouTube) session in a voice channel')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Voice channel to watch in')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    }

    const channel = interaction.options.getChannel('channel', true) as VoiceChannel;

    try {
      const invite = await channel.createInvite({
        maxAge: 0,
        targetType: 2,
        targetApplication: WATCH_TOGETHER_ID
      });

      return interaction.reply({
        content: `📺 **Watch Together** is ready!\n\n👉 [Click here to join](https://discord.gg/${invite.code}) in **${channel.name}**\n\nYou can search and watch YouTube videos together — no call needed!`
      });
    } catch (err) {
      return interaction.reply({
        content: 'Failed to create the activity. Make sure I have **Create Invite** permission in that channel.',
        flags: 64
      });
    }
  }
}
