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

const COUNTRY_FLAG: Record<string, string> = {
  'UAE': '\u{1F1E6}\u{1F1EA}',
  'United States': '\u{1F1FA}\u{1F1F8}',
  'United Kingdom': '\u{1F1EC}\u{1F1E7}',
  'Canada': '\u{1F1E8}\u{1F1E6}',
  'Australia': '\u{1F1E6}\u{1F1FA}',
  'India': '\u{1F1EE}\u{1F1F3}',
  'Germany': '\u{1F1E9}\u{1F1EA}',
  'France': '\u{1F1EB}\u{1F1F7}',
  'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  'Singapore': '\u{1F1F8}\u{1F1EC}',
  'Japan': '\u{1F1EF}\u{1F1F5}',
  'South Korea': '\u{1F1F0}\u{1F1F7}',
  'Brazil': '\u{1F1E7}\u{1F1F7}',
  'Netherlands': '\u{1F1F3}\u{1F1F1}',
  'Other': '\u{1F30D}'
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
            .setName('country')
            .setDescription('Your country')
            .setRequired(true)
            .addChoices(
              { name: 'UAE', value: 'UAE' },
              { name: 'United States', value: 'United States' },
              { name: 'United Kingdom', value: 'United Kingdom' },
              { name: 'Canada', value: 'Canada' },
              { name: 'Australia', value: 'Australia' },
              { name: 'India', value: 'India' },
              { name: 'Germany', value: 'Germany' },
              { name: 'France', value: 'France' },
              { name: 'Saudi Arabia', value: 'Saudi Arabia' },
              { name: 'Singapore', value: 'Singapore' },
              { name: 'Japan', value: 'Japan' },
              { name: 'South Korea', value: 'South Korea' },
              { name: 'Brazil', value: 'Brazil' },
              { name: 'Netherlands', value: 'Netherlands' },
              { name: 'Other', value: 'Other' }
            )
        )
        .addStringOption((o) =>
          o
            .setName('category')
            .setDescription('Item category')
            .setRequired(true)
            .addChoices(
              { name: 'Electronics', value: 'Electronics' },
              { name: 'Books', value: 'Books' },
              { name: 'Video Games', value: 'Video Games' },
              { name: 'Toys', value: 'Toys' },
              { name: 'Household Items', value: 'Household Items' },
              { name: 'Kitchen Items', value: 'Kitchen Items' },
              { name: 'Furniture', value: 'Furniture' },
              { name: 'Sports Equipment', value: 'Sports Equipment' },
              { name: 'Clothing & Accessories', value: 'Clothing & Accessories' },
              { name: 'Jewelry & Watches', value: 'Jewelry & Watches' },
              { name: 'Board Games', value: 'Board Games' },
              { name: 'Uniforms', value: 'Uniforms' }
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
    const country = interaction.options.getString('country', true);
    const category = interaction.options.getString('category', true);
    const price = interaction.options.getNumber('price');
    const condition = interaction.options.getString('condition') ?? 'Good';
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
      country,
      description
    });

    // Build the listing embed
    const flag = COUNTRY_FLAG[country] ?? '\u{1F30D}';
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(TYPE_COLOURS[type] ?? 0x95a5a6)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()
      .setFooter({ text: `Listing #${listingId} | ${type} | ${flag} ${country}` });

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Type', value: type, inline: true },
      { name: 'Category', value: category, inline: true },
      { name: 'Condition', value: condition, inline: true },
      { name: 'Country', value: `${flag} ${country}`, inline: true }
    ];

    if (type !== 'Wanted' && price != null) {
      fields.push({ name: 'Price', value: price === 0 ? 'Free' : `$${price.toFixed(2)}`, inline: true });
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
