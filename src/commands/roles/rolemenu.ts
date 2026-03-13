import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  Role,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { container } from '@sapphire/framework';

// Simple role menu using a StringSelectMenu
// Stores config in role_menus.json field in sqlite for later editing (MVP stores only message id).

@ApplyOptions<Command.Options>({
  description: 'Create a self-assignable role menu',
  requiredUserPermissions: [PermissionFlagsBits.ManageRoles]
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('rolemenu')
        .setDescription('Role menu tools')
        .addSubcommand((sc) =>
          sc
            .setName('create')
            .setDescription('Create a role menu (select roles)')
            .addStringOption((o) => o.setName('title').setDescription('Menu title').setRequired(true))
            .addStringOption((o) => o.setName('description').setDescription('Menu description').setRequired(false))
            .addRoleOption((o) => o.setName('role1').setDescription('Role option 1').setRequired(true))
            .addRoleOption((o) => o.setName('role2').setDescription('Role option 2').setRequired(false))
            .addRoleOption((o) => o.setName('role3').setDescription('Role option 3').setRequired(false))
            .addRoleOption((o) => o.setName('role4').setDescription('Role option 4').setRequired(false))
            .addRoleOption((o) => o.setName('role5').setDescription('Role option 5').setRequired(false))
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description') ?? 'Select roles to toggle.';

    const roles: Role[] = [];
    for (const k of ['role1', 'role2', 'role3', 'role4', 'role5'] as const) {
      const r = interaction.options.getRole(k as any);
      if (r && r instanceof Role) roles.push(r);
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('rolemenu:toggle')
      .setMinValues(0)
      .setMaxValues(Math.min(roles.length, 10))
      .setPlaceholder('Select roles to toggle')
      .addOptions(
        roles.map((r) =>
          new StringSelectMenuOptionBuilder().setLabel(r.name).setValue(r.id)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const msg = await interaction.channel?.send({ content: `**${title}**\n${description}`, components: [row] });

    if (msg) {
      container.db
        .prepare('INSERT INTO role_menus (guild_id, channel_id, message_id, title, description, json) VALUES (?, ?, ?, ?, ?, ?)')
        .run(interaction.guildId, interaction.channelId, msg.id, title, description, JSON.stringify({ roles: roles.map((r) => ({ id: r.id, name: r.name })) }));
    }

    return interaction.reply({ content: 'Role menu created.', ephemeral: true });
  }
}
