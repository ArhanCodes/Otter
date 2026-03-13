import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { guildSettings } from '../../db.js';

@ApplyOptions<Command.Options>({
  description: 'Configure anti-raid join rate limits + quarantine',
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('antiraid')
        .setDescription('Anti-raid settings')
        .addSubcommand((sc) =>
          sc
            .setName('status')
            .setDescription('View current anti-raid settings')
        )
        .addSubcommand((sc) =>
          sc
            .setName('enable')
            .setDescription('Enable anti-raid')
            .addIntegerOption((o) =>
              o
                .setName('joins_per_min')
                .setDescription('Trigger if joins per minute exceed this (default 6)')
                .setMinValue(2)
                .setMaxValue(60)
                .setRequired(false)
            )
        )
        .addSubcommand((sc) => sc.setName('disable').setDescription('Disable anti-raid'))
        .addSubcommand((sc) =>
          sc
            .setName('quarantine_role')
            .setDescription('Set the quarantine role (applied during raids)')
            .addRoleOption((o) => o.setName('role').setDescription('Role to apply to new joins').setRequired(true))
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const sub = interaction.options.getSubcommand(true);
    const settings = guildSettings.get(container.db, interaction.guildId);

    if (sub === 'status') {
      return interaction.reply({
        content: `Anti-raid: **${settings.anti_raid_enabled ? 'ENABLED' : 'disabled'}**\nJoins/min threshold: **${settings.anti_raid_joins_per_min ?? 6}**\nQuarantine role: ${settings.quarantine_role_id ? `<@&${settings.quarantine_role_id}>` : '**not set**'}`,
        ephemeral: true
      });
    }

    if (sub === 'enable') {
      const joinsPerMin = interaction.options.getInteger('joins_per_min') ?? 6;
      guildSettings.setAntiRaid(container.db, interaction.guildId, { enabled: true, joinsPerMin });
      return interaction.reply({ content: `Anti-raid enabled (threshold ${joinsPerMin}/min).`, ephemeral: true });
    }

    if (sub === 'disable') {
      guildSettings.setAntiRaid(container.db, interaction.guildId, { enabled: false, joinsPerMin: settings.anti_raid_joins_per_min ?? 6 });
      return interaction.reply({ content: 'Anti-raid disabled.', ephemeral: true });
    }

    if (sub === 'quarantine_role') {
      const role = interaction.options.getRole('role', true);
      guildSettings.setQuarantineRole(container.db, interaction.guildId, role.id);
      return interaction.reply({ content: `Quarantine role set to <@&${role.id}>.`, ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
}
