import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  PermissionFlagsBits
} from 'discord.js';

// Minimal AutoMod management (keyword rules)

@ApplyOptions<Command.Options>({
  description: 'Manage Discord AutoMod rules (minimal)',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('automod')
        .setDescription('AutoMod rules')
        .addSubcommand((sc) => sc.setName('list').setDescription('List AutoMod rules'))
        .addSubcommand((sc) =>
          sc
            .setName('keyword')
            .setDescription('Create a keyword AutoMod rule')
            .addStringOption((o) => o.setName('name').setDescription('Rule name').setRequired(true))
            .addStringOption((o) =>
              o
                .setName('keywords')
                .setDescription('Comma-separated keywords (e.g. scam, nitro, free)')
                .setRequired(true)
            )
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enabled?').setRequired(false))
        )
        .addSubcommand((sc) =>
          sc
            .setName('delete')
            .setDescription('Delete an AutoMod rule')
            .addStringOption((o) => o.setName('rule_id').setDescription('Rule ID').setRequired(true))
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'list') {
      const rules = await interaction.guild.autoModerationRules.fetch().catch(() => null);
      if (!rules) return interaction.reply({ content: 'Could not fetch rules.', ephemeral: true });

      const lines = [...rules.values()].map((r) => `• ${r.name} — id: ${r.id} — ${r.enabled ? 'enabled' : 'disabled'}`);
      return interaction.reply({ content: lines.length ? lines.join('\n') : 'No AutoMod rules found.', ephemeral: true });
    }

    if (sub === 'keyword') {
      const name = interaction.options.getString('name', true);
      const keywords = interaction.options
        .getString('keywords', true)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const enabled = interaction.options.getBoolean('enabled') ?? true;

      const rule = await interaction.guild.autoModerationRules.create({
        name,
        enabled,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: { keywordFilter: keywords },
        actions: [{ type: AutoModerationActionType.BlockMessage }]
      });

      return interaction.reply({ content: `Created AutoMod rule: ${rule.name} (id: ${rule.id})`, ephemeral: true });
    }

    if (sub === 'delete') {
      const id = interaction.options.getString('rule_id', true);
      await interaction.guild.autoModerationRules.delete(id).catch(() => null);
      return interaction.reply({ content: `Deleted rule (if it existed): ${id}`, ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
}
