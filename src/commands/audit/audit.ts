import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'View recent audit log entries (quick dashboard)',
  requiredUserPermissions: [PermissionFlagsBits.ViewAuditLog]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('audit')
        .setDescription('Audit log tools')
        .addSubcommand((sc) =>
          sc
            .setName('recent')
            .setDescription('Show recent audit log entries')
            .addIntegerOption((o) => o.setName('limit').setDescription('Max entries (1-20)').setMinValue(1).setMaxValue(20))
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });
    const limit = interaction.options.getInteger('limit') ?? 10;

    const logs = await interaction.guild.fetchAuditLogs({ limit }).catch(() => null);
    if (!logs) return interaction.reply({ content: 'Could not fetch audit logs.', ephemeral: true });

    const lines = logs.entries.map((e) => {
      const actor = e.executor ? `${e.executor.tag}` : 'Unknown';
      const target = e.target ? (typeof e.target === 'string' ? e.target : (e.target as any).id ?? '') : '';
      const reason = e.reason ? ` — ${e.reason}` : '';
      return `• **${e.action}** by **${actor}** ${target ? `(target ${target})` : ''}${reason}`;
    });

    return interaction.reply({ content: lines.length ? lines.join('\n') : 'No entries.', ephemeral: true });
  }
}
