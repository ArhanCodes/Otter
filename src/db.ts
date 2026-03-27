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

    CREATE TABLE IF NOT EXISTS ai_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      system_prompt TEXT,
      model TEXT,
      max_history INTEGER NOT NULL DEFAULT 25
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      parent_message_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_messages_channel ON ai_messages(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_parent ON ai_messages(parent_message_id);
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

export interface AiConfig {
  guild_id: string;
  enabled: number;
  system_prompt: string | null;
  model: string | null;
  max_history: number;
}

export const aiConfig = {
  get(db: Db, guildId: string): AiConfig {
    const row = db.prepare('SELECT * FROM ai_config WHERE guild_id = ?').get(guildId) as AiConfig | undefined;
    return row ?? { guild_id: guildId, enabled: 0, system_prompt: null, model: null, max_history: 25 };
  },
  setEnabled(db: Db, guildId: string, enabled: boolean) {
    db.prepare(
      `INSERT INTO ai_config (guild_id, enabled)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET enabled=excluded.enabled`
    ).run(guildId, enabled ? 1 : 0);
  },
  setSystemPrompt(db: Db, guildId: string, prompt: string | null) {
    db.prepare(
      `INSERT INTO ai_config (guild_id, system_prompt)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET system_prompt=excluded.system_prompt`
    ).run(guildId, prompt);
  },
  setModel(db: Db, guildId: string, model: string | null) {
    db.prepare(
      `INSERT INTO ai_config (guild_id, model)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET model=excluded.model`
    ).run(guildId, model);
  },
  setMaxHistory(db: Db, guildId: string, max: number) {
    db.prepare(
      `INSERT INTO ai_config (guild_id, max_history)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET max_history=excluded.max_history`
    ).run(guildId, max);
  }
};

export interface AiMessage {
  id: number;
  guild_id: string;
  channel_id: string;
  user_id: string;
  message_id: string;
  role: string;
  content: string;
  parent_message_id: string | null;
  created_at: number;
}

export const aiMessages = {
  add(db: Db, input: { guildId: string; channelId: string; userId: string; messageId: string; role: string; content: string; parentMessageId?: string | null }) {
    db.prepare(
      'INSERT OR IGNORE INTO ai_messages (guild_id, channel_id, user_id, message_id, role, content, parent_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(input.guildId, input.channelId, input.userId, input.messageId, input.role, input.content, input.parentMessageId ?? null, Date.now());
  },
  getConversation(db: Db, messageId: string, limit: number): AiMessage[] {
    // Walk up the parent chain to build conversation history
    const rows = db.prepare(`
      WITH RECURSIVE convo AS (
        SELECT * FROM ai_messages WHERE message_id = ?
        UNION ALL
        SELECT m.* FROM ai_messages m
        JOIN convo c ON m.message_id = c.parent_message_id
      )
      SELECT * FROM convo ORDER BY created_at ASC
    `).all(messageId) as AiMessage[];
    // Return only the last N messages
    return rows.slice(-limit);
  },
  getRecentInChannel(db: Db, channelId: string, limit: number): AiMessage[] {
    return db.prepare(
      'SELECT * FROM ai_messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(channelId, limit).reverse() as AiMessage[];
  },
  deleteByMessageId(db: Db, messageId: string) {
    db.prepare('DELETE FROM ai_messages WHERE message_id = ?').run(messageId);
  }
};
