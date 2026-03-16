import { container } from '@sapphire/framework';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { createHash } from 'crypto';
import { fortniteFeeds, fortniteState, type Db } from '../../db.js';

const REPO = 'Fortnite-Datamining/Fortnite-Datamining';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main/data`;
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OtterBot-Fortnite/1.0' },
      signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function rarityColor(rarity?: string): number {
  const r = rarity?.toLowerCase() ?? '';
  if (r.includes('legendary')) return 0xf0b132;
  if (r.includes('epic')) return 0xb94fe0;
  if (r.includes('rare')) return 0x3f9fe0;
  if (r.includes('uncommon')) return 0x60aa3a;
  if (r.includes('mythic') || r.includes('marvel') || r.includes('dc') || r.includes('icon') || r.includes('gaming') || r.includes('star wars')) return 0xffd700;
  if (r.includes('common')) return 0x8c8c8c;
  return 0x00b2ff;
}

async function sendToFeeds(db: Db, embeds: EmbedBuilder[], content?: string) {
  const feeds = fortniteFeeds.getAll(db);
  if (feeds.length === 0) return;

  for (const feed of feeds) {
    try {
      const channel = await container.client.channels.fetch(feed.channel_id);
      if (!channel || !(channel instanceof TextChannel)) continue;

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

// --- Build / Update Detection ---

interface BuildInfo {
  build: string;
  version: string | null;
}

async function checkBuild(db: Db) {
  const data = await fetchJSON<BuildInfo>(`${RAW_BASE}/meta/build_info.json`);
  if (!data?.build) return;

  const currentHash = hash(data.build);
  const oldHash = fortniteState.getHash(db, 'build');

  if (oldHash === currentHash) return;

  if (oldHash) {
    const version = data.build.replace(/\+\+Fortnite\+Release-/, 'v').replace(/-CL-.*/, '');

    const embeds = [
      new EmbedBuilder()
        .setTitle('🔄 New Fortnite Update Detected!')
        .setDescription('A new build has been pushed to the servers. New skins, items, and changes may follow shortly.')
        .addFields(
          { name: 'Version', value: version || 'Unknown', inline: true },
          { name: 'Build', value: `\`${data.build}\``, inline: false }
        )
        .setColor(0xe74c3c)
        .setTimestamp()
        .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
    ];

    await sendToFeeds(db, embeds);
  }

  fortniteState.setHash(db, 'build', currentHash);
}

// --- Cosmetics ---

interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type?: { displayValue: string };
  rarity?: { displayValue: string };
  introduction?: { text: string };
  images?: { icon?: string; featured?: string; smallIcon?: string };
  set?: { value: string };
}

async function checkCosmetics(db: Db) {
  const data = await fetchJSON<CosmeticItem[]>(`${RAW_BASE}/cosmetics/br.json`);
  if (!data || !Array.isArray(data)) return;

  const ids = data.map((i) => i.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'cosmetics_br');

  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'cosmetics_br_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.filter((item) => !oldIds.has(item.id));

    if (newItems.length > 0 && newItems.length <= 50) {
      const embeds: EmbedBuilder[] = [];

      embeds.push(
        new EmbedBuilder()
          .setTitle('🆕 New Cosmetics Found!')
          .setDescription(`**${newItems.length}** new item${newItems.length === 1 ? '' : 's'} discovered in the game files. These haven't been released yet — here's a sneak peek:`)
          .setColor(0x00b2ff)
          .setTimestamp()
      );

      for (const item of newItems.slice(0, 24)) {
        const embed = new EmbedBuilder()
          .setTitle(item.name)
          .setDescription(item.description || 'No description yet')
          .setColor(rarityColor(item.rarity?.displayValue));

        const fields: { name: string; value: string; inline: boolean }[] = [];
        if (item.type?.displayValue) fields.push({ name: 'Type', value: item.type.displayValue, inline: true });
        if (item.rarity?.displayValue) fields.push({ name: 'Rarity', value: item.rarity.displayValue, inline: true });
        if (item.set?.value) fields.push({ name: 'Set', value: item.set.value, inline: true });
        if (fields.length) embed.addFields(fields);

        const img = item.images?.featured ?? item.images?.icon ?? item.images?.smallIcon;
        if (img) embed.setThumbnail(img);

        embed.setFooter({ text: 'Fortnite Datamining • Otter Bot' });
        embeds.push(embed);
      }

      if (newItems.length > 24) {
        embeds.push(
          new EmbedBuilder()
            .setDescription(`...and **${newItems.length - 24}** more. Check the [full list on GitHub](https://github.com/${REPO}).`)
            .setColor(0x00b2ff)
        );
      }

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'cosmetics_br', currentHash);
  fortniteState.setHash(db, 'cosmetics_br_ids', JSON.stringify(ids));
}

// --- Item Shop ---

interface ShopData {
  data: {
    date: string;
    entries: {
      brItems?: {
        id: string;
        name: string;
        description: string;
        type?: { displayValue: string };
        rarity?: { displayValue: string };
        images?: { icon?: string; featured?: string };
        set?: { value: string };
      }[];
      finalPrice: number;
      bundle?: { name: string };
    }[];
  };
}

async function checkShop(db: Db) {
  const data = await fetchJSON<ShopData>(`${RAW_BASE}/shop/current.json`);
  if (!data?.data?.entries) return;

  const currentHash = hash(data.data.date ?? JSON.stringify(data.data.entries.map((e) => e.brItems?.map((i) => i.id)).flat().sort()));
  const oldHash = fortniteState.getHash(db, 'shop');

  if (oldHash === currentHash) return;
  fortniteState.setHash(db, 'shop', currentHash);

  if (!oldHash) return;

  const embeds: EmbedBuilder[] = [];

  embeds.push(
    new EmbedBuilder()
      .setTitle('🛒 Item Shop Updated!')
      .setDescription('The Fortnite Item Shop has rotated. Here\'s what\'s available:')
      .setColor(0x2ecc71)
      .setTimestamp()
  );

  const seenNames = new Set<string>();
  const lines: string[] = [];

  for (const entry of data.data.entries) {
    const item = entry.brItems?.[0];
    if (!item) continue;
    const name = entry.bundle?.name ?? item.name;
    if (!name || seenNames.has(name)) continue;
    seenNames.add(name);

    const price = entry.finalPrice;
    const rarity = item.rarity?.displayValue ?? 'Unknown';
    const type = item.type?.displayValue ?? '';
    lines.push(`**${name}** — ${price.toLocaleString()} V-Bucks • ${rarity} ${type}`);
  }

  for (let i = 0; i < Math.min(lines.length, 30); i += 10) {
    const chunk = lines.slice(i, i + 10);
    embeds.push(
      new EmbedBuilder()
        .setDescription(chunk.join('\n'))
        .setColor(0x2ecc71)
    );
  }

  if (lines.length > 30) {
    embeds.push(
      new EmbedBuilder()
        .setDescription(`...and **${lines.length - 30}** more items. Check the [full shop on GitHub](https://github.com/${REPO}).`)
        .setColor(0x2ecc71)
    );
  }

  embeds[embeds.length - 1].setFooter({ text: 'Fortnite Datamining • Otter Bot' });

  await sendToFeeds(db, embeds);
}

// --- News ---

interface NewsData {
  data: {
    br?: {
      motds?: { id: string; title: string; body: string; image: string }[];
    };
    fn?: {
      motds?: { id: string; title: string; body: string; image: string }[];
    };
  };
}

async function checkNews(db: Db) {
  const data = await fetchJSON<NewsData>(`${RAW_BASE}/news/current.json`);
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
          .setTitle('📰 New In-Game News!')
          .setDescription('Epic just posted new in-game news:')
          .setColor(0xe67e22)
          .setTimestamp()
      );

      for (const motd of newMotds.slice(0, 9)) {
        const embed = new EmbedBuilder()
          .setTitle(motd.title || 'News Update')
          .setDescription(motd.body || 'No details')
          .setColor(0xe67e22);
        if (motd.image) embed.setImage(motd.image);
        embed.setFooter({ text: 'Fortnite Datamining • Otter Bot' });
        embeds.push(embed);
      }

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'news', currentHash);
  fortniteState.setHash(db, 'news_ids', JSON.stringify(motds.map((m) => m.id).sort()));
}

// --- Playlists / Gamemodes ---

interface PlaylistData {
  id: string;
  name: string;
  description: string;
}

async function checkPlaylists(db: Db) {
  const data = await fetchJSON<PlaylistData[]>(`${RAW_BASE}/playlists/current.json`);
  if (!data || !Array.isArray(data)) return;

  const ids = data.map((p) => p.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'playlists');

  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'playlists_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newPlaylists = data.filter((p) => !oldIds.has(p.id));

    if (newPlaylists.length > 0 && newPlaylists.length <= 20) {
      const lines = newPlaylists.map((p) => `**${p.name || p.id}** — ${p.description || 'No description'}`);

      const embeds = [
        new EmbedBuilder()
          .setTitle('🎮 New Gamemodes Detected!')
          .setDescription(`**${newPlaylists.length}** new gamemode${newPlaylists.length === 1 ? '' : 's'} found:\n\n${lines.slice(0, 10).join('\n')}`)
          .setColor(0x9b59b6)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ];

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'playlists', currentHash);
  fortniteState.setHash(db, 'playlists_ids', JSON.stringify(ids));
}

// --- AES Keys ---

interface AESData {
  mainKey: string;
  dynamicKeys: { pakFilename: string; key: string }[];
}

async function checkAES(db: Db) {
  const data = await fetchJSON<AESData>(`${RAW_BASE}/aes/current.json`);
  if (!data) return;

  const currentHash = hash(JSON.stringify(data));
  const oldHash = fortniteState.getHash(db, 'aes');

  if (oldHash === currentHash) return;

  if (oldHash) {
    const newDynamic = data.dynamicKeys?.length ?? 0;

    const embeds = [
      new EmbedBuilder()
        .setTitle('🔑 AES Keys Updated!')
        .setDescription('New encryption keys have been detected. This usually means new encrypted content is being prepared.')
        .addFields(
          { name: 'Main Key', value: `\`${data.mainKey ?? 'Unchanged'}\``, inline: false },
          { name: 'Dynamic Keys', value: `${newDynamic} key${newDynamic === 1 ? '' : 's'} found`, inline: true }
        )
        .setColor(0xf39c12)
        .setTimestamp()
        .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
    ];

    await sendToFeeds(db, embeds);
  }

  fortniteState.setHash(db, 'aes', currentHash);
}

// --- Poller ---

async function pollOnce() {
  const db = container.db;

  const feeds = fortniteFeeds.getAll(db);
  if (feeds.length === 0) return;

  container.logger.info('Polling Fortnite-Datamining repo for changes...');

  try {
    await Promise.allSettled([
      checkBuild(db),
      checkCosmetics(db),
      checkShop(db),
      checkNews(db),
      checkPlaylists(db),
      checkAES(db)
    ]);
  } catch (err) {
    container.logger.warn(`Fortnite poll error: ${err}`);
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startFortnitePoller() {
  if (pollTimer) return;

  container.logger.info('Fortnite datamining poller started — watching GitHub repo every 5 min');

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
