import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { listings } from '../../db.js';

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

const TYPE_COLOURS: Record<string, number> = {
  Sell: 0x3498db,
  Donate: 0x2ecc71,
  Wanted: 0xf1c40f
};

@ApplyOptions<Command.Options>({
  description: 'Browse listings in your country'
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('listings')
        .setDescription('Browse listings filtered by country')
        .addStringOption((o) =>
          o
            .setName('country')
            .setDescription('Filter by country')
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
            .setDescription('Filter by category')
            .setRequired(false)
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
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Guild only.', ephemeral: true });

    const db = container.db;
    const country = interaction.options.getString('country', true);
    const category = interaction.options.getString('category');

    const results = listings.getByCountry(db, interaction.guildId, country, category);

    if (results.length === 0) {
      const flag = COUNTRY_FLAG[country] ?? '\u{1F30D}';
      return interaction.reply({
        content: `No active listings found in ${flag} **${country}**${category ? ` for **${category}**` : ''}.`,
        ephemeral: true
      });
    }

    // Show up to 10 listings
    const shown = results.slice(0, 10);
    const flag = COUNTRY_FLAG[country] ?? '\u{1F30D}';

    const embed = new EmbedBuilder()
      .setTitle(`${flag} Listings in ${country}${category ? ` — ${category}` : ''}`)
      .setColor(0x3498db)
      .setFooter({ text: `Showing ${shown.length} of ${results.length} listings` });

    const lines = shown.map((l: any) => {
      const priceStr = l.type === 'Wanted' ? '' : l.price === 0 ? ' — Free' : ` — $${l.price.toFixed(2)}`;
      const time = `<t:${Math.floor(l.created_at / 1000)}:R>`;
      return `**#${l.id}** ${l.title}${priceStr}\n${l.type} | ${l.category} | ${l.condition} | ${time} | <@${l.user_id}>`;
    });

    embed.setDescription(lines.join('\n\n'));

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
