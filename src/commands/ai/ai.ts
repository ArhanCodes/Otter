import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { aiConfig } from '../../db.js';

@ApplyOptions<Command.Options>({
  description: 'Configure AI chat for this server',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('ai')
        .setDescription('Configure AI chat')
        .addSubcommand((sc) =>
          sc
            .setName('enable')
            .setDescription('Enable AI chat (bot responds when mentioned)')
        )
        .addSubcommand((sc) =>
          sc
            .setName('disable')
            .setDescription('Disable AI chat')
        )
        .addSubcommand((sc) =>
          sc
            .setName('prompt')
            .setDescription('Set a custom system prompt')
            .addStringOption((o) =>
              o.setName('text').setDescription('System prompt (use "reset" to restore default)').setRequired(true)
            )
        )
        .addSubcommand((sc) =>
          sc
            .setName('model')
            .setDescription('Set the AI model to use')
            .addStringOption((o) =>
              o.setName('name').setDescription('Model name (e.g. anthropic/claude-sonnet-4, openai/gpt-4o)').setRequired(true)
            )
        )
        .addSubcommand((sc) =>
          sc
            .setName('history')
            .setDescription('Set max conversation history length')
            .addIntegerOption((o) =>
              o.setName('count').setDescription('Max messages to include (1-50)').setRequired(true).setMinValue(1).setMaxValue(50)
            )
        )
        .addSubcommand((sc) =>
          sc
            .setName('status')
            .setDescription('Show current AI configuration')
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const db = container.db;
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'enable') {
      aiConfig.setEnabled(db, interaction.guildId, true);
      return interaction.reply({ content: 'AI chat **enabled**. Members can now mention the bot to chat.', ephemeral: true });
    }

    if (sub === 'disable') {
      aiConfig.setEnabled(db, interaction.guildId, false);
      return interaction.reply({ content: 'AI chat **disabled**.', ephemeral: true });
    }

    if (sub === 'prompt') {
      const text = interaction.options.getString('text', true);
      if (text.toLowerCase() === 'reset') {
        aiConfig.setSystemPrompt(db, interaction.guildId, null);
        return interaction.reply({ content: 'System prompt reset to default.', ephemeral: true });
      }
      aiConfig.setSystemPrompt(db, interaction.guildId, text);
      return interaction.reply({ content: 'System prompt updated.', ephemeral: true });
    }

    if (sub === 'model') {
      const name = interaction.options.getString('name', true);
      aiConfig.setModel(db, interaction.guildId, name);
      return interaction.reply({ content: `Model set to \`${name}\`.`, ephemeral: true });
    }

    if (sub === 'history') {
      const count = interaction.options.getInteger('count', true);
      aiConfig.setMaxHistory(db, interaction.guildId, count);
      return interaction.reply({ content: `Max history set to **${count}** messages.`, ephemeral: true });
    }

    if (sub === 'status') {
      const config = aiConfig.get(db, interaction.guildId);
      const lines = [
        `**AI Chat Status**`,
        `Enabled: ${config.enabled ? 'Yes' : 'No'}`,
        `Model: \`${config.model ?? '(default)'}\``,
        `Max History: ${config.max_history}`,
        `System Prompt: ${config.system_prompt ? `\`${config.system_prompt.slice(0, 100)}${config.system_prompt.length > 100 ? '…' : ''}\`` : '(default)'}`
      ];
      return interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
}
