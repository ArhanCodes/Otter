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
  `);
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
  setAntiRaid(db: Db, guildId: string, input: { enabled: boolean; joinsPerMin: number }) {
    db.prepare(
      `INSERT INTO guild_settings (guild_id, anti_raid_enabled, anti_raid_joins_per_min)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET anti_raid_enabled=excluded.anti_raid_enabled, anti_raid_joins_per_min=excluded.anti_raid_joins_per_min`
    ).run(guildId, input.enabled ? 1 : 0, input.joinsPerMin);
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
