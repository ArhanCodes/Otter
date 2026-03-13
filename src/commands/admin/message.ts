import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, TextChannel } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'Send a message as the bot',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('message')
        .setDescription('Send a message as the bot')
        .addStringOption((o) => o.setName('text').setDescription('The message to send').setRequired(true))
        .addChannelOption((o) => o.setName('channel').setDescription('Channel to send in (defaults to current)').setRequired(false))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const text = interaction.options.getString('text', true);
    const targetChannel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

    if (!targetChannel || !('send' in targetChannel)) {
      return interaction.reply({ content: 'Invalid channel.', ephemeral: true });
    }

    await targetChannel.send(text);
    return interaction.reply({ content: `Message sent in <#${targetChannel.id}>`, ephemeral: true });
  }
}
