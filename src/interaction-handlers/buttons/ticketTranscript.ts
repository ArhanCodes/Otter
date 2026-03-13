import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, TextChannel } from 'discord.js';
import { AttachmentBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import { buildTranscript } from '../../lib/tickets/transcript.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class UserInteractionHandler extends InteractionHandler {
  public override async run(interaction: ButtonInteraction, ticketId: number) {
    if (!interaction.inCachedGuild()) return;

    const row = container.db.prepare('SELECT * FROM tickets WHERE id=? AND guild_id=?').get(ticketId, interaction.guildId) as any;
    if (!row) return interaction.reply({ content: 'Ticket not found.', ephemeral: true });

    const ch = interaction.channel as TextChannel;
    const transcript = await buildTranscript(ch, 100);

    container.db
      .prepare('INSERT INTO ticket_transcripts (ticket_id, transcript) VALUES (?, ?) ON CONFLICT(ticket_id) DO UPDATE SET transcript=excluded.transcript')
      .run(ticketId, transcript);

    const file = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `ticket-${ticketId}-transcript.txt` });
    return interaction.reply({ content: 'Transcript generated:', files: [file], ephemeral: true });
  }

  public override async parse(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return this.none();
    if (!interaction.customId.startsWith('ticket:transcript:')) return this.none();
    const parts = interaction.customId.split(':');
    const ticketId = Number(parts[2]);
    if (!Number.isFinite(ticketId)) return this.none();
    return this.some(ticketId);
  }
}
