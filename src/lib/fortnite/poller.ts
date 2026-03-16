import { container } from '@sapphire/framework';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { createHash } from 'crypto';
import { fortniteFeeds, fortniteState, type Db } from '../../db.js';

const API_BASE = 'https://fortnite-api.com';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type?: { displayValue: string };
  rarity?: { displayValue: string };
  introduction?: { text: string; season: string };
  images?: { icon: string; featured?: string; smallIcon?: string };
  set?: { value: string };
  added: string;
}

interface ShopEntry {
  regularPrice: number;
  finalPrice: number;
  bundle?: { name: string };
  items: {
    id: string;
    name: string;
    description: string;
    type: { displayValue: string };
    rarity: { displayValue: string };
    images: { icon: string; featured?: string; smallIcon?: string };
  }[];
}

interface NewsEntry {
  title: string;
  body: string;
  image: string;
}

interface NewsMotd {
  id: string;
  title: string;
  body: string;
  image: string;
  tabTitle?: string;
}

function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'User-Agent': 'OtterBot-Fortnite/1.0' },
      signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function cosmeticEmbed(item: CosmeticItem): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(item.name)
    .setDescription(item.description || 'No description')
    .setColor(rarityColor(item.rarity?.displayValue))
    .setTimestamp();

  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (item.type?.displayValue) fields.push({ name: 'Type', value: item.type.displayValue, inline: true });
  if (item.rarity?.displayValue) fields.push({ name: 'Rarity', value: item.rarity.displayValue, inline: true });
  if (item.set?.value) fields.push({ name: 'Set', value: item.set.value, inline: true });
  if (item.introduction?.text) fields.push({ name: 'Introduction', value: item.introduction.text, inline: false });

  embed.addFields(fields);

  const img = item.images?.featured ?? item.images?.icon ?? item.images?.smallIcon;
  if (img) embed.setThumbnail(img);

  embed.setFooter({ text: 'Fortnite Datamining • Otter Bot' });

  return embed;
}

function rarityColor(rarity?: string): number {
  switch (rarity?.toLowerCase()) {
    case 'legendary': return 0xf0b132;
    case 'epic': return 0xb94fe0;
    case 'rare': return 0x3f9fe0;
    case 'uncommon': return 0x60aa3a;
    case 'common': return 0x8c8c8c;
    case 'mythic': return 0xffd700;
    case 'exotic': return 0x53c3d8;
    default: return 0x00b2ff;
  }
}

async function sendToFeeds(db: Db, embeds: EmbedBuilder[], content?: string) {
  const feeds = fortniteFeeds.getAll(db);
  if (feeds.length === 0) return;

  for (const feed of feeds) {
    try {
      const channel = await container.client.channels.fetch(feed.channel_id);
      if (!channel || !(channel instanceof TextChannel)) continue;

      // Send in batches of 10 (Discord limit)
      for (let i = 0; i < embeds.length; i += 10) {
        const batch = embeds.slice(i, i + 10);
        await channel.send({
          content: i === 0 ? content : undefined,
          embeds: batch
        });
      }
    } catch (err) {
      container.logger.warn(`Failed to post Fortnite update to ${feed.channel_id}: ${err}`);
    }
  }
}

async function checkCosmetics(db: Db) {
  const data = await apiFetch<{ data: CosmeticItem[] }>('/v2/cosmetics/br');
  if (!data?.data) return;

  const currentHash = hash(JSON.stringify(data.data.map((i) => i.id).sort()));
  const oldHash = fortniteState.getHash(db, 'cosmetics_br');

  if (oldHash === currentHash) return;

  // Find new items
  if (oldHash) {
    // Get old IDs from stored state - we store them alongside the hash
    const oldIdsRaw = fortniteState.getHash(db, 'cosmetics_br_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.data.filter((item) => !oldIds.has(item.id));

    if (newItems.length > 0 && newItems.length <= 50) {
      const embeds: EmbedBuilder[] = [];

      const header = new EmbedBuilder()
        .setTitle('🆕 New Cosmetics Found in the Files!')
        .setDescription(`**${newItems.length}** new cosmetic${newItems.length === 1 ? '' : 's'} discovered in the latest update.`)
        .setColor(0x00b2ff)
        .setTimestamp();
      embeds.push(header);

      for (const item of newItems.slice(0, 24)) {
        embeds.push(cosmeticEmbed(item));
      }

      if (newItems.length > 24) {
        embeds.push(
          new EmbedBuilder()
            .setDescription(`...and **${newItems.length - 24}** more. Check the full list on GitHub.`)
            .setColor(0x00b2ff)
        );
      }

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'cosmetics_br', currentHash);
  fortniteState.setHash(db, 'cosmetics_br_ids', JSON.stringify(data.data.map((i) => i.id).sort()));
}

async function checkShop(db: Db) {
  const data = await apiFetch<{ data: { entries: ShopEntry[] } }>('/v2/shop');
  if (!data?.data?.entries) return;

  const currentHash = hash(JSON.stringify(data.data.entries.map((e) => e.items.map((i) => i.id)).flat().sort()));
  const oldHash = fortniteState.getHash(db, 'shop');

  if (oldHash === currentHash) return;
  fortniteState.setHash(db, 'shop', currentHash);

  // Only post if we had a previous hash (skip first run)
  if (!oldHash) return;

  const embeds: EmbedBuilder[] = [];

  const header = new EmbedBuilder()
    .setTitle('🛒 Item Shop Updated!')
    .setDescription(`The Fortnite Item Shop has rotated. Here's what's available:`)
    .setColor(0x2ecc71)
    .setTimestamp();
  embeds.push(header);

  // Group notable items
  const seenNames = new Set<string>();
  const notable: ShopEntry[] = [];
  for (const entry of data.data.entries) {
    const name = entry.bundle?.name ?? entry.items[0]?.name;
    if (name && !seenNames.has(name)) {
      seenNames.add(name);
      notable.push(entry);
    }
  }

  // Show up to 15 items in a compact format
  const lines: string[] = [];
  for (const entry of notable.slice(0, 20)) {
    const item = entry.items[0];
    if (!item) continue;
    const name = entry.bundle?.name ?? item.name;
    const price = entry.finalPrice;
    const rarity = item.rarity?.displayValue ?? 'Unknown';
    const type = item.type?.displayValue ?? '';
    lines.push(`**${name}** — ${price.toLocaleString()} V-Bucks • ${rarity} ${type}`);
  }

  if (lines.length > 0) {
    // Split into chunks to avoid embed description limits
    const chunkSize = 10;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      embeds.push(
        new EmbedBuilder()
          .setDescription(chunk.join('\n'))
          .setColor(0x2ecc71)
      );
    }
  }

  if (notable.length > 20) {
    embeds.push(
      new EmbedBuilder()
        .setDescription(`...and **${notable.length - 20}** more items in the shop.`)
        .setColor(0x2ecc71)
    );
  }

  await sendToFeeds(db, embeds);
}

async function checkNews(db: Db) {
  const data = await apiFetch<{ data: { br?: { motds?: NewsMotd[] }; fn?: { motds?: NewsMotd[] } } }>('/v2/news');
  if (!data?.data) return;

  const motds = [...(data.data.br?.motds ?? []), ...(data.data.fn?.motds ?? [])];
  const currentHash = hash(JSON.stringify(motds.map((m) => m.id).sort()));
  const oldHash = fortniteState.getHash(db, 'news');

  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'news_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newMotds = motds.filter((m) => !oldIds.has(m.id));

    if (newMotds.length > 0 && newMotds.length <= 10) {
      const embeds: EmbedBuilder[] = [];

      embeds.push(
        new EmbedBuilder()
          .setTitle('📰 Fortnite News Updated')
          .setDescription('New in-game news has been posted:')
          .setColor(0xe67e22)
          .setTimestamp()
      );

      for (const motd of newMotds.slice(0, 9)) {
        const embed = new EmbedBuilder()
          .setTitle(motd.title || 'News Update')
          .setDescription(motd.body || 'No details')
          .setColor(0xe67e22);
        if (motd.image) embed.setImage(motd.image);
        embeds.push(embed);
      }

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'news', currentHash);
  fortniteState.setHash(db, 'news_ids', JSON.stringify(motds.map((m) => m.id).sort()));
}

async function checkPlaylists(db: Db) {
  const data = await apiFetch<{ data: { id: string; name: string; description: string }[] }>('/v1/playlists');
  if (!data?.data) return;

  const currentHash = hash(JSON.stringify(data.data.map((p) => p.id).sort()));
  const oldHash = fortniteState.getHash(db, 'playlists');

  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'playlists_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newPlaylists = data.data.filter((p) => !oldIds.has(p.id));

    if (newPlaylists.length > 0 && newPlaylists.length <= 20) {
      const lines = newPlaylists.map((p) => `**${p.name || p.id}** — ${p.description || 'No description'}`);

      const embeds = [
        new EmbedBuilder()
          .setTitle('🎮 Gamemodes Changed')
          .setDescription(`**${newPlaylists.length}** new gamemode${newPlaylists.length === 1 ? '' : 's'}:\n\n${lines.slice(0, 10).join('\n')}`)
          .setColor(0x9b59b6)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ];

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'playlists', currentHash);
  fortniteState.setHash(db, 'playlists_ids', JSON.stringify(data.data.map((p) => p.id).sort()));
}

async function checkAES(db: Db) {
  const data = await apiFetch<{ data: { build: string; mainKey: string; dynamicKeys: { pakFilename: string; pakGuid: string; key: string }[] } }>('/v2/aes');
  if (!data?.data) return;

  const build = data.data.build ?? '';
  const currentHash = hash(build);
  const oldHash = fortniteState.getHash(db, 'build');

  if (oldHash === currentHash) return;

  if (oldHash) {
    // Parse version from build string
    const version = build.replace(/\+\+Fortnite\+Release-/, 'v').replace(/-CL-.*/, '');

    const embeds = [
      new EmbedBuilder()
        .setTitle('🔄 New Fortnite Update Detected!')
        .setDescription(`A new build has been pushed to the servers.`)
        .addFields(
          { name: 'Version', value: version || 'Unknown', inline: true },
          { name: 'Build', value: `\`${build}\``, inline: false }
        )
        .setColor(0xe74c3c)
        .setTimestamp()
        .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
    ];

    await sendToFeeds(db, embeds);
  }

  fortniteState.setHash(db, 'build', currentHash);
}

async function pollOnce() {
  const db = container.db;

  // Skip if no feeds are set up
  const feeds = fortniteFeeds.getAll(db);
  if (feeds.length === 0) return;

  try {
    await Promise.allSettled([
      checkAES(db),
      checkCosmetics(db),
      checkShop(db),
      checkNews(db),
      checkPlaylists(db)
    ]);
  } catch (err) {
    container.logger.warn(`Fortnite poll error: ${err}`);
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startFortnitePoller() {
  if (pollTimer) return;

  container.logger.info('Fortnite datamining poller started (every 5 min)');

  // Run first poll after a short delay to let the bot fully initialize
  setTimeout(() => {
    pollOnce();
    pollTimer = setInterval(pollOnce, POLL_INTERVAL);
  }, 10_000);
}

export function stopFortnitePoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
