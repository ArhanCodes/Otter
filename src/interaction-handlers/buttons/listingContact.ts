import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { EmbedBuilder, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class UserInteractionHandler extends InteractionHandler {
  public override async run(interaction: ButtonInteraction) {
    const sellerId = interaction.customId.replace('listing_contact_', '');

    if (interaction.user.id === sellerId) {
      return interaction.reply({ content: "You can't contact yourself.", ephemeral: true });
    }

    const seller = await interaction.client.users.fetch(sellerId).catch(() => null);
    if (!seller) {
      return interaction.reply({ content: 'Could not find this user.', ephemeral: true });
    }

    const listingEmbed = interaction.message.embeds[0];
    const title = listingEmbed?.title ?? 'a listing';

    try {
      await seller.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Someone is interested in your listing!')
            .setDescription(
              `**${interaction.user.tag}** is interested in your listing **${title}** in **${interaction.guild?.name ?? 'a server'}**.\n\n` +
              `They can be reached at <@${interaction.user.id}>.`
            )
            .setColor(0x3498db)
            .setTimestamp()
        ]
      });
    } catch {
      return interaction.reply({ content: "Couldn't DM the seller. Their DMs may be closed.", ephemeral: true });
    }

    return interaction.reply({
      content: `The seller has been notified via DM that you're interested in **${title}**. They'll reach out to you!`,
      ephemeral: true
    });
  }

  public override async parse(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return this.none();
    if (!interaction.customId.startsWith('listing_contact_')) return this.none();
    return this.some();
  }
}
