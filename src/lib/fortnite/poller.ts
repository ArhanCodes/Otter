import { container } from '@sapphire/framework';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { createHash } from 'crypto';
import { fortniteFeeds, fortniteState, type Db } from '../../db.js';

const REPO = 'Fortnite-Datamining/Fortnite-Datamining';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main/data`;
const POLL_INTERVAL = 5 * 60 * 1000;

function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OtterBot-Fortnite/1.0', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function rarityColor(rarity?: string): number {
  const r = (rarity ?? '').toLowerCase();
  if (r.includes('legendary')) return 0xf0b132;
  if (r.includes('epic')) return 0xb94fe0;
  if (r.includes('rare')) return 0x3f9fe0;
  if (r.includes('uncommon')) return 0x60aa3a;
  if (r.includes('common')) return 0x8c8c8c;
  if (r.includes('mythic')) return 0xffd700;
  if (r.includes('marvel')) return 0xed1d24;
  if (r.includes('dc')) return 0x0078f0;
  if (r.includes('icon')) return 0x00cccc;
  if (r.includes('star wars')) return 0xffe81f;
  if (r.includes('gaming')) return 0x7c5ff5;
  if (r.includes('lego')) return 0xffd500;
  return 0x00b2ff;
}

function rarityEmoji(rarity?: string): string {
  const r = (rarity ?? '').toLowerCase();
  if (r.includes('legendary')) return '🟠';
  if (r.includes('epic')) return '🟣';
  if (r.includes('rare')) return '🔵';
  if (r.includes('uncommon')) return '🟢';
  if (r.includes('mythic')) return '🟡';
  if (r.includes('marvel') || r.includes('dc') || r.includes('icon') || r.includes('star wars') || r.includes('gaming')) return '⭐';
  return '⚪';
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
        await channel.send({ content: i === 0 ? content : undefined, embeds: batch });
      }
    } catch (err) {
      container.logger.warn(`Failed to post Fortnite update to ${feed.channel_id}: ${err}`);
    }
  }
}

// ─── Build / Game Update ─────────────────────────────────────────

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
    // Parse "++Fortnite+Release-39.51-CL-51287198" → "39.51"
    const versionMatch = data.build.match(/Release-([\d.]+)/);
    const version = versionMatch?.[1] ?? 'Unknown';

    await sendToFeeds(db, [
      new EmbedBuilder()
        .setTitle(`🚨 Fortnite v${version} Update Detected!`)
        .setDescription(
          `A new Fortnite update has just been pushed!\n\n` +
          `**What this means:**\n` +
          `• New skins, items, and cosmetics may have been added to the files\n` +
          `• Map changes could be incoming\n` +
          `• New gamemodes or weapons might be on the way\n` +
          `• Check back soon — we'll post everything we find!`
        )
        .addFields({ name: 'Version', value: `v${version}`, inline: true })
        .setColor(0xe74c3c)
        .setTimestamp()
        .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
    ]);
  }

  fortniteState.setHash(db, 'build', currentHash);
}

// ─── BR Cosmetics (Skins, Emotes, Back Blings, etc.) ────────────

interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type?: { displayValue: string };
  rarity?: { displayValue: string };
  series?: { value: string };
  introduction?: { text: string; chapter?: string; season?: string };
  images?: { icon?: string; featured?: string; smallIcon?: string };
  set?: { value: string; text?: string };
  variants?: { channel: string; type: string; options: { name: string; image?: string }[] }[];
}

async function checkCosmetics(db: Db) {
  const raw = await fetchJSON<{ data: CosmeticItem[] }>(`${RAW_BASE}/cosmetics/br.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((i) => i.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'cosmetics_br');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'cosmetics_br_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.filter((item) => !oldIds.has(item.id));

    if (newItems.length > 0 && newItems.length <= 80) {
      const embeds: EmbedBuilder[] = [];

      // Group by type
      const byType = new Map<string, CosmeticItem[]>();
      for (const item of newItems) {
        const type = item.type?.displayValue ?? 'Other';
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type)!.push(item);
      }

      // Summary header
      const typeSummary = [...byType.entries()]
        .map(([type, items]) => `• **${items.length}** ${type}${items.length === 1 ? '' : 's'}`)
        .join('\n');

      embeds.push(
        new EmbedBuilder()
          .setTitle(`🆕 ${newItems.length} New Cosmetics Found!`)
          .setDescription(
            `New items have been added to the game files — these are **unreleased** and could appear in the shop soon!\n\n` +
            `**Breakdown:**\n${typeSummary}`
          )
          .setColor(0x00b2ff)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      );

      // Individual items with big images
      for (const item of newItems.slice(0, 20)) {
        const embed = new EmbedBuilder()
          .setTitle(`${rarityEmoji(item.rarity?.displayValue)} ${item.name}`)
          .setColor(rarityColor(item.rarity?.displayValue));

        // Build a clean description
        const desc: string[] = [];
        if (item.description) desc.push(`*"${item.description}"*`);
        desc.push('');
        if (item.type?.displayValue) desc.push(`**Type:** ${item.type.displayValue}`);
        if (item.rarity?.displayValue) desc.push(`**Rarity:** ${item.rarity.displayValue}`);
        if (item.set?.value) desc.push(`**Set:** ${item.set.value}`);
        if (item.introduction?.text) desc.push(`**${item.introduction.text}**`);
        if (item.variants && item.variants.length > 0) {
          const styleCount = item.variants.reduce((sum, v) => sum + v.options.length, 0);
          desc.push(`**Styles:** ${styleCount} variant${styleCount === 1 ? '' : 's'} available`);
        }

        embed.setDescription(desc.join('\n'));

        // Use featured image (big) for outfits, icon for everything else
        const featured = item.images?.featured;
        const icon = item.images?.icon ?? item.images?.smallIcon;
        if (featured && item.type?.displayValue === 'Outfit') {
          embed.setImage(featured);
        } else if (icon) {
          embed.setThumbnail(icon);
        }

        embeds.push(embed);
      }

      if (newItems.length > 20) {
        embeds.push(
          new EmbedBuilder()
            .setDescription(`...and **${newItems.length - 20}** more items! View the full list on [GitHub](https://github.com/${REPO}).`)
            .setColor(0x00b2ff)
        );
      }

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'cosmetics_br', currentHash);
  fortniteState.setHash(db, 'cosmetics_br_ids', JSON.stringify(ids));
}

// ─── Item Shop ───────────────────────────────────────────────────

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
      regularPrice: number;
      bundle?: { name: string };
      giftable: boolean;
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

  // Deduplicate
  const seenNames = new Set<string>();
  const items: { name: string; price: number; regularPrice: number; rarity: string; type: string; giftable: boolean; image?: string }[] = [];

  for (const entry of data.data.entries) {
    const item = entry.brItems?.[0];
    if (!item) continue;
    const name = entry.bundle?.name ?? item.name;
    if (!name || seenNames.has(name)) continue;
    seenNames.add(name);
    items.push({
      name,
      price: entry.finalPrice,
      regularPrice: entry.regularPrice,
      rarity: item.rarity?.displayValue ?? 'Unknown',
      type: item.type?.displayValue ?? '',
      giftable: entry.giftable,
      image: item.images?.featured ?? item.images?.icon
    });
  }

  // Header
  const date = new Date(data.data.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  embeds.push(
    new EmbedBuilder()
      .setTitle(`🛒 Item Shop — ${dateStr}`)
      .setDescription(`The Item Shop has reset! Here's everything available today:\n\n**${items.length} items** in today's shop`)
      .setColor(0x2ecc71)
      .setTimestamp()
  );

  // Group items into clean lists
  const lines: string[] = [];
  for (const item of items) {
    const emoji = rarityEmoji(item.rarity);
    const sale = item.regularPrice > item.price ? ` ~~${item.regularPrice.toLocaleString()}~~ **SALE!**` : '';
    const gift = item.giftable ? ' 🎁' : '';
    lines.push(`${emoji} **${item.name}** — ${item.price.toLocaleString()} V-Bucks${sale}${gift}\n> ${item.rarity} ${item.type}`);
  }

  // Split into embed chunks (max ~4096 chars per description)
  for (let i = 0; i < Math.min(lines.length, 40); i += 8) {
    const chunk = lines.slice(i, i + 8);
    embeds.push(
      new EmbedBuilder()
        .setDescription(chunk.join('\n\n'))
        .setColor(0x2ecc71)
    );
  }

  if (items.length > 40) {
    embeds.push(
      new EmbedBuilder()
        .setDescription(`...and **${items.length - 40}** more items in the shop!`)
        .setColor(0x2ecc71)
    );
  }

  embeds[embeds.length - 1].setFooter({ text: '🎁 = Giftable • Fortnite Datamining • Otter Bot' });

  await sendToFeeds(db, embeds);
}

// ─── News ────────────────────────────────────────────────────────

interface NewsData {
  data: {
    br?: { motds?: { id: string; title: string; body: string; image: string }[] };
    stw?: { motds?: { id: string; title: string; body: string; image: string }[] };
  };
}

async function checkNews(db: Db) {
  const data = await fetchJSON<NewsData>(`${RAW_BASE}/news/current.json`);
  if (!data?.data) return;

  const motds = [...(data.data.br?.motds ?? []), ...(data.data.stw?.motds ?? [])];
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
          .setDescription('Epic Games just posted new announcements:')
          .setColor(0xe67e22)
          .setTimestamp()
      );

      for (const motd of newMotds.slice(0, 9)) {
        const embed = new EmbedBuilder()
          .setTitle(motd.title || 'News Update')
          .setDescription(motd.body || 'No details available')
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

// ─── Playlists / Gamemodes ───────────────────────────────────────

interface PlaylistItem {
  id: string;
  name: string;
  description: string;
  isLimitedTimeMode?: boolean;
  maxPlayers?: number;
  maxSquadSize?: number;
}

async function checkPlaylists(db: Db) {
  const raw = await fetchJSON<{ data: PlaylistItem[] }>(`${RAW_BASE}/playlists/current.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((p) => p.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'playlists');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'playlists_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newPlaylists = data.filter((p) => !oldIds.has(p.id));

    if (newPlaylists.length > 0 && newPlaylists.length <= 20) {
      const lines = newPlaylists.map((p) => {
        const name = p.name || p.id;
        const desc = p.description || 'No description yet';
        const ltm = p.isLimitedTimeMode ? ' **(LTM)**' : '';
        const players = p.maxPlayers ? ` • Up to ${p.maxPlayers} players` : '';
        const squad = p.maxSquadSize && p.maxSquadSize > 1 ? ` • Squads of ${p.maxSquadSize}` : '';
        return `🎮 **${name}**${ltm}\n> ${desc}${players}${squad}`;
      });

      await sendToFeeds(db, [
        new EmbedBuilder()
          .setTitle(`🎮 ${newPlaylists.length} New Gamemode${newPlaylists.length === 1 ? '' : 's'} Detected!`)
          .setDescription(
            `New gamemodes have been added to the files:\n\n${lines.slice(0, 10).join('\n\n')}`
          )
          .setColor(0x9b59b6)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ]);
    }
  }

  fortniteState.setHash(db, 'playlists', currentHash);
  fortniteState.setHash(db, 'playlists_ids', JSON.stringify(ids));
}

// ─── Jam Tracks (Festival) ───────────────────────────────────────

interface JamTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  releaseYear?: number;
  duration?: number;
  genres?: string[];
  difficulty?: Record<string, number>;
}

async function checkTracks(db: Db) {
  const raw = await fetchJSON<{ data: JamTrack[] }>(`${RAW_BASE}/cosmetics/tracks.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((t) => t.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'tracks');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'tracks_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newTracks = data.filter((t) => !oldIds.has(t.id));

    if (newTracks.length > 0 && newTracks.length <= 30) {
      const lines = newTracks.map((t) => {
        const duration = t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : '';
        const genre = t.genres?.join(', ') ?? '';
        return `🎵 **${t.title}** by **${t.artist}**\n> ${genre}${duration ? ` • ${duration}` : ''}${t.releaseYear ? ` • ${t.releaseYear}` : ''}`;
      });

      await sendToFeeds(db, [
        new EmbedBuilder()
          .setTitle(`🎵 ${newTracks.length} New Jam Track${newTracks.length === 1 ? '' : 's'} Found!`)
          .setDescription(
            `New songs are coming to Fortnite Festival:\n\n${lines.slice(0, 10).join('\n\n')}`
          )
          .setColor(0x1db954)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ]);
    }
  }

  fortniteState.setHash(db, 'tracks', currentHash);
  fortniteState.setHash(db, 'tracks_ids', JSON.stringify(ids));
}

// ─── LEGO Cosmetics ─────────────────────────────────────────────

interface LegoItem {
  id: string;
  cosmeticId?: string;
  images?: { large?: string; small?: string };
}

async function checkLego(db: Db) {
  const raw = await fetchJSON<{ data: LegoItem[] }>(`${RAW_BASE}/cosmetics/lego.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((i) => i.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'lego');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'lego_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.filter((i) => !oldIds.has(i.id));

    if (newItems.length > 0 && newItems.length <= 30) {
      const embeds: EmbedBuilder[] = [
        new EmbedBuilder()
          .setTitle(`🧱 ${newItems.length} New LEGO Skin${newItems.length === 1 ? '' : 's'} Found!`)
          .setDescription(`New LEGO styles have been added to the game files. These skins will be available in LEGO Fortnite!`)
          .setColor(0xffd500)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ];

      for (const item of newItems.slice(0, 5)) {
        const img = item.images?.large ?? item.images?.small;
        if (img) {
          embeds.push(
            new EmbedBuilder()
              .setImage(img)
              .setColor(0xffd500)
          );
        }
      }

      await sendToFeeds(db, embeds);
    }
  }

  fortniteState.setHash(db, 'lego', currentHash);
  fortniteState.setHash(db, 'lego_ids', JSON.stringify(ids));
}

// ─── Cars / Vehicles ────────────────────────────────────────────

interface CarItem {
  id: string;
  name: string;
  description?: string;
  images?: { icon?: string; smallIcon?: string };
}

async function checkCars(db: Db) {
  const raw = await fetchJSON<{ data: CarItem[] }>(`${RAW_BASE}/cosmetics/cars.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((i) => i.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'cars');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'cars_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.filter((i) => !oldIds.has(i.id));

    if (newItems.length > 0 && newItems.length <= 20) {
      const lines = newItems.map((c) => `🚗 **${c.name}**${c.description ? `\n> ${c.description}` : ''}`);

      await sendToFeeds(db, [
        new EmbedBuilder()
          .setTitle(`🚗 ${newItems.length} New Vehicle${newItems.length === 1 ? '' : 's'} Found!`)
          .setDescription(`New vehicles have been added to the files:\n\n${lines.slice(0, 10).join('\n\n')}`)
          .setColor(0x3498db)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ]);
    }
  }

  fortniteState.setHash(db, 'cars', currentHash);
  fortniteState.setHash(db, 'cars_ids', JSON.stringify(ids));
}

// ─── Instruments (Festival) ─────────────────────────────────────

interface InstrumentItem {
  id: string;
  name: string;
  description?: string;
  type?: { displayValue: string };
  rarity?: { displayValue: string };
  images?: { icon?: string; smallIcon?: string };
}

async function checkInstruments(db: Db) {
  const raw = await fetchJSON<{ data: InstrumentItem[] }>(`${RAW_BASE}/cosmetics/instruments.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((i) => i.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'instruments');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'instruments_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.filter((i) => !oldIds.has(i.id));

    if (newItems.length > 0 && newItems.length <= 20) {
      const lines = newItems.map((i) => {
        const rarity = i.rarity?.displayValue ?? '';
        return `🎸 **${i.name}**${rarity ? ` • ${rarity}` : ''}${i.description ? `\n> ${i.description}` : ''}`;
      });

      await sendToFeeds(db, [
        new EmbedBuilder()
          .setTitle(`🎸 ${newItems.length} New Instrument${newItems.length === 1 ? '' : 's'} Found!`)
          .setDescription(`New Festival instruments have been added:\n\n${lines.slice(0, 10).join('\n\n')}`)
          .setColor(0xe91e63)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ]);
    }
  }

  fortniteState.setHash(db, 'instruments', currentHash);
  fortniteState.setHash(db, 'instruments_ids', JSON.stringify(ids));
}

// ─── Banners ─────────────────────────────────────────────────────

interface BannerItem {
  id: string;
  name: string;
  description?: string;
  images?: { icon?: string; smallIcon?: string };
}

async function checkBanners(db: Db) {
  const raw = await fetchJSON<{ data: BannerItem[] }>(`${RAW_BASE}/banners/current.json`);
  if (!raw?.data) return;
  const data = raw.data;

  const ids = data.map((i) => i.id).sort();
  const currentHash = hash(JSON.stringify(ids));
  const oldHash = fortniteState.getHash(db, 'banners');
  if (oldHash === currentHash) return;

  if (oldHash) {
    const oldIdsRaw = fortniteState.getHash(db, 'banners_ids');
    const oldIds = new Set(oldIdsRaw ? JSON.parse(oldIdsRaw) as string[] : []);
    const newItems = data.filter((i) => !oldIds.has(i.id));

    if (newItems.length > 0 && newItems.length <= 30) {
      await sendToFeeds(db, [
        new EmbedBuilder()
          .setTitle(`🏳️ ${newItems.length} New Banner${newItems.length === 1 ? '' : 's'} Found!`)
          .setDescription(
            `New banners have been added to the files:\n\n` +
            newItems.slice(0, 15).map((b) => `• **${b.name || b.id}**${b.description ? ` — ${b.description}` : ''}`).join('\n')
          )
          .setColor(0x1abc9c)
          .setTimestamp()
          .setFooter({ text: 'Fortnite Datamining • Otter Bot' })
      ]);
    }
  }

  fortniteState.setHash(db, 'banners', currentHash);
  fortniteState.setHash(db, 'banners_ids', JSON.stringify(ids));
}

// ─── Poller ──────────────────────────────────────────────────────

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
      checkTracks(db),
      checkLego(db),
      checkCars(db),
      checkInstruments(db),
      checkBanners(db)
    ]);
  } catch (err) {
    container.logger.warn(`Fortnite poll error: ${err}`);
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startFortnitePoller() {
  if (pollTimer) return;
  container.logger.info('Fortnite datamining poller started — watching GitHub repo every 5 min');
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
