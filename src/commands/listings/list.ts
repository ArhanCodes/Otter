import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from 'discord.js';
import { guildSettings, listings } from '../../db.js';

const TYPE_COLOURS: Record<string, number> = {
  Sell: 0x3498db,
  Donate: 0x2ecc71,
  Wanted: 0xf1c40f
};

@ApplyOptions<Command.Options>({
  description: 'List an item for sale, donation, or as wanted'
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('list')
        .setDescription('List an item for sale, donation, or as wanted')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Listing type')
            .setRequired(true)
            .addChoices(
              { name: 'Sell', value: 'Sell' },
              { name: 'Donate', value: 'Donate' },
              { name: 'Wanted', value: 'Wanted' }
            )
        )
        .addStringOption((o) => o.setName('title').setDescription('Item title').setRequired(true))
        .addStringOption((o) =>
          o
            .setName('category')
            .setDescription('Item category')
            .setRequired(false)
            .addChoices(
              { name: 'Uniforms', value: 'Uniforms' },
              { name: 'Books', value: 'Books' },
              { name: 'Sports', value: 'Sports' },
              { name: 'Stationery', value: 'Stationery' },
              { name: 'Other', value: 'Other' }
            )
        )
        .addNumberOption((o) => o.setName('price').setDescription('Price (only for Sell/Donate)').setMinValue(0).setRequired(false))
        .addStringOption((o) =>
          o
            .setName('condition')
            .setDescription('Item condition')
            .setRequired(false)
            .addChoices(
              { name: 'New', value: 'New' },
              { name: 'Like New', value: 'Like New' },
              { name: 'Good', value: 'Good' },
              { name: 'Fair', value: 'Fair' },
              { name: 'Any', value: 'Any' }
            )
        )
        .addStringOption((o) => o.setName('location').setDescription('Location (e.g. Dubai)').setRequired(false))
        .addStringOption((o) => o.setName('description').setDescription('Description of the item').setRequired(false))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const db = container.db;
    const settings = guildSettings.get(db, interaction.guildId);
    const listingsChannelId = settings.listings_channel_id as string | null;

    if (!listingsChannelId) {
      return interaction.reply({ content: 'Listings channel not set. An admin needs to run `/config listings` first.', ephemeral: true });
    }

    const type = interaction.options.getString('type', true);
    const title = interaction.options.getString('title', true);
    const category = interaction.options.getString('category') ?? 'Other';
    const price = interaction.options.getNumber('price');
    const condition = interaction.options.getString('condition') ?? 'Good';
    const location = interaction.options.getString('location') ?? '';
    const description = interaction.options.getString('description') ?? '';

    // Save to DB
    const listingId = listings.add(db, {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      type,
      title,
      price: type === 'Wanted' ? null : (price ?? 0),
      category,
      condition,
      location,
      description
    });

    // Build the listing embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(TYPE_COLOURS[type] ?? 0x95a5a6)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()
      .setFooter({ text: `Listing #${listingId} | ${type}` });

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Type', value: type, inline: true },
      { name: 'Category', value: category, inline: true },
      { name: 'Condition', value: condition, inline: true }
    ];

    if (type !== 'Wanted' && price != null) {
      fields.push({ name: 'Price', value: price === 0 ? 'Free' : `$${price.toFixed(2)}`, inline: true });
    }

    if (location) {
      fields.push({ name: 'Location', value: location, inline: true });
    }

    if (description) {
      embed.setDescription(description);
    }

    embed.addFields(fields);

    // Contact button
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`listing_contact_${interaction.user.id}`)
        .setLabel('Contact Seller')
        .setStyle(ButtonStyle.Primary)
    );

    // Post to listings channel
    const listingsChannel = await interaction.guild.channels.fetch(listingsChannelId).catch(() => null);
    if (!listingsChannel || !(listingsChannel instanceof TextChannel)) {
      return interaction.reply({ content: 'Listings channel not found or is not a text channel.', ephemeral: true });
    }

    const message = await listingsChannel.send({ embeds: [embed], components: [row] });
    listings.setMessageId(db, listingId as number, message.id);

    return interaction.reply({
      content: `Your listing **${title}** has been posted in <#${listingsChannelId}>!`,
      ephemeral: true
    });
  }
}
