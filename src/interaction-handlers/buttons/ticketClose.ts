import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, TextChannel } from 'discord.js';
import { container } from '@sapphire/framework';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class UserInteractionHandler extends InteractionHandler {
  public override async run(interaction: ButtonInteraction, ticketId: number) {
    if (!interaction.inCachedGuild()) return;

    const row = container.db.prepare('SELECT * FROM tickets WHERE id=? AND guild_id=?').get(ticketId, interaction.guildId) as any;
    if (!row) return interaction.reply({ content: 'Ticket not found.', ephemeral: true });

    container.db.prepare('UPDATE tickets SET status=?, closed_at=? WHERE id=?').run('closed', Date.now(), ticketId);

    await interaction.reply({ content: 'Closing ticket…', ephemeral: true });
    const ch = interaction.channel as TextChannel;
    setTimeout(() => ch.delete('Ticket closed').catch(() => null), 1500);
  }

  public override async parse(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return this.none();
    if (!interaction.customId.startsWith('ticket:close:')) return this.none();
    const parts = interaction.customId.split(':');
    const ticketId = Number(parts[2]);
    if (!Number.isFinite(ticketId)) return this.none();
    return this.some(ticketId);
  }
}
