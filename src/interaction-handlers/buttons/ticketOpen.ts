import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  type ButtonInteraction
} from 'discord.js';
import { container } from '@sapphire/framework';

function nextName(n: number) {
  return `ticket-${String(n).padStart(4, '0')}`;
}

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class UserInteractionHandler extends InteractionHandler {
  public override async run(interaction: ButtonInteraction) {
    if (!interaction.inCachedGuild()) return;

    const cfg = container.db.prepare('SELECT * FROM ticket_config WHERE guild_id=?').get(interaction.guildId) as any;
    if (!cfg?.category_id || !cfg?.support_role_id) {
      return interaction.reply({ content: 'Ticket system not configured. Run `/ticket setup`.', ephemeral: true });
    }

    const countRow = container.db.prepare('SELECT COUNT(*) as c FROM tickets WHERE guild_id=?').get(interaction.guildId) as any;
    const n = (countRow?.c ?? 0) + 1;

    const channel = await interaction.guild.channels.create({
      name: nextName(n),
      type: ChannelType.GuildText,
      parent: cfg.category_id,
      permissionOverwrites: [
        { id: interaction.guildId, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: cfg.support_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });

    const ticketId = container.db
      .prepare('INSERT INTO tickets (guild_id, channel_id, opener_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(interaction.guildId, channel.id, interaction.user.id, 'open', Date.now()).lastInsertRowid as number;

    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket:close:${ticketId}`).setLabel('Close').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`ticket:transcript:${ticketId}`).setLabel('Transcript').setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: `Ticket opened by <@${interaction.user.id}>. Support will be with you shortly.\n\nUse the buttons below when done.`,
      components: [controls]
    });

    return interaction.reply({ content: `Created ticket: <#${channel.id}>`, ephemeral: true });
  }

  public override async parse(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return this.none();
    if (interaction.customId !== 'ticket:open') return this.none();
    return this.some();
  }
}
