import Database from 'better-sqlite3';
import { env } from './env.js';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

export function openDb(): Db {
  const dir = path.dirname(env.DB_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(env.DB_PATH);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      mod_log_channel_id TEXT,
      mute_role_id TEXT,
      quarantine_role_id TEXT,
      listings_channel_id TEXT,
      anti_raid_enabled INTEGER DEFAULT 0,
      anti_raid_joins_per_min INTEGER DEFAULT 6
    );

    CREATE TABLE IF NOT EXISTS infractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      mod_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_config (
      guild_id TEXT PRIMARY KEY,
      category_id TEXT,
      support_role_id TEXT,
      panel_channel_id TEXT,
      panel_message_id TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      opener_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      closed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ticket_transcripts (
      ticket_id INTEGER PRIMARY KEY,
      transcript TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fortnite_feeds (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS fortnite_state (
      key TEXT PRIMARY KEY,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      price REAL,
      category TEXT NOT NULL DEFAULT 'Other',
      condition TEXT NOT NULL DEFAULT 'Good',
      country TEXT NOT NULL DEFAULT 'Other',
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );
  `);

  // Safe column additions for existing databases
  try { db.exec('ALTER TABLE guild_settings ADD COLUMN listings_channel_id TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE listings ADD COLUMN country TEXT NOT NULL DEFAULT \'Other\''); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE listings ADD COLUMN category TEXT NOT NULL DEFAULT \'Other\''); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE listings ADD COLUMN condition TEXT NOT NULL DEFAULT \'Good\''); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE listings ADD COLUMN description TEXT DEFAULT \'\''); } catch { /* already exists */ }

}

export const guildSettings = {
  get(db: Db, guildId: string) {
    const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) as any;
    return row ?? { guild_id: guildId, mod_log_channel_id: null, mute_role_id: null };
  },
  setModLogChannel(db: Db, guildId: string, channelId: string | null) {
    db.prepare(
      `INSERT INTO guild_settings (guild_id, mod_log_channel_id)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET mod_log_channel_id=excluded.mod_log_channel_id`
    ).run(guildId, channelId);
  },
  setMuteRole(db: Db, guildId: string, roleId: string | null) {
    db.prepare(
      `INSERT INTO guild_settings (guild_id, mute_role_id)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET mute_role_id=excluded.mute_role_id`
    ).run(guildId, roleId);
  },
  setQuarantineRole(db: Db, guildId: string, roleId: string | null) {
    db.prepare(
      `INSERT INTO guild_settings (guild_id, quarantine_role_id)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET quarantine_role_id=excluded.quarantine_role_id`
    ).run(guildId, roleId);
  },
  setListingsChannel(db: Db, guildId: string, channelId: string | null) {
    db.prepare(
      `INSERT INTO guild_settings (guild_id, listings_channel_id)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET listings_channel_id=excluded.listings_channel_id`
    ).run(guildId, channelId);
  },
  setAntiRaid(db: Db, guildId: string, input: { enabled: boolean; joinsPerMin: number }) {
    db.prepare(
      `INSERT INTO guild_settings (guild_id, anti_raid_enabled, anti_raid_joins_per_min)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET anti_raid_enabled=excluded.anti_raid_enabled, anti_raid_joins_per_min=excluded.anti_raid_joins_per_min`
    ).run(guildId, input.enabled ? 1 : 0, input.joinsPerMin);
  }
};

export const listings = {
  add(db: Db, input: { guildId: string; userId: string; messageId?: string; type: string; title: string; price: number | null; category: string; condition: string; country: string; description: string }) {
    const info = db
      .prepare('INSERT INTO listings (guild_id, user_id, message_id, type, title, price, category, condition, country, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(input.guildId, input.userId, input.messageId ?? null, input.type, input.title, input.price, input.category, input.condition, input.country, input.description, Date.now());
    return info.lastInsertRowid;
  },
  setMessageId(db: Db, id: number | bigint, messageId: string) {
    db.prepare('UPDATE listings SET message_id = ? WHERE id = ?').run(messageId, id);
  },
  getByUser(db: Db, guildId: string, userId: string) {
    return db.prepare('SELECT * FROM listings WHERE guild_id = ? AND user_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, userId, 'active') as any[];
  },
  getByCountry(db: Db, guildId: string, country: string, category?: string | null) {
    if (category) {
      return db.prepare('SELECT * FROM listings WHERE guild_id = ? AND country = ? AND category = ? AND status = ? ORDER BY created_at DESC').all(guildId, country, category, 'active') as any[];
    }
    return db.prepare('SELECT * FROM listings WHERE guild_id = ? AND country = ? AND status = ? ORDER BY created_at DESC').all(guildId, country, 'active') as any[];
  },
  remove(db: Db, id: number, userId: string) {
    return db.prepare('UPDATE listings SET status = ? WHERE id = ? AND user_id = ?').run('removed', id, userId);
  }
};

export const fortniteFeeds = {
  add(db: Db, guildId: string, channelId: string) {
    db.prepare(
      'INSERT OR IGNORE INTO fortnite_feeds (guild_id, channel_id) VALUES (?, ?)'
    ).run(guildId, channelId);
  },
  remove(db: Db, guildId: string, channelId: string) {
    db.prepare('DELETE FROM fortnite_feeds WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
  },
  getAll(db: Db) {
    return db.prepare('SELECT * FROM fortnite_feeds').all() as { guild_id: string; channel_id: string }[];
  },
  getForGuild(db: Db, guildId: string) {
    return db.prepare('SELECT * FROM fortnite_feeds WHERE guild_id = ?').all(guildId) as { guild_id: string; channel_id: string }[];
  }
};

export const fortniteState = {
  getHash(db: Db, key: string): string | null {
    const row = db.prepare('SELECT hash FROM fortnite_state WHERE key = ?').get(key) as { hash: string } | undefined;
    return row?.hash ?? null;
  },
  setHash(db: Db, key: string, hash: string) {
    db.prepare('INSERT INTO fortnite_state (key, hash) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET hash=excluded.hash').run(key, hash);
  }
};

export const infractions = {
  add(db: Db, input: { guildId: string; userId: string; modId: string; type: string; reason?: string | null }) {
    const info = db
      .prepare('INSERT INTO infractions (guild_id, user_id, mod_id, type, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(input.guildId, input.userId, input.modId, input.type, input.reason ?? null, Date.now());
    return info.lastInsertRowid;
  }
};
