import Database from 'better-sqlite3';
import { env } from './env.js';
import fs from 'node:fs';
import path from 'node:path';
export function openDb() {
    const dir = path.dirname(env.DB_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(env.DB_PATH);
    db.pragma('journal_mode = WAL');
    migrate(db);
    return db;
}
function migrate(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      mod_log_channel_id TEXT,
      mute_role_id TEXT
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
  `);
}
export const guildSettings = {
    get(db, guildId) {
        const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
        return row ?? { guild_id: guildId, mod_log_channel_id: null, mute_role_id: null };
    },
    setModLogChannel(db, guildId, channelId) {
        db.prepare(`INSERT INTO guild_settings (guild_id, mod_log_channel_id)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET mod_log_channel_id=excluded.mod_log_channel_id`).run(guildId, channelId);
    },
    setMuteRole(db, guildId, roleId) {
        db.prepare(`INSERT INTO guild_settings (guild_id, mute_role_id)
       VALUES (?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET mute_role_id=excluded.mute_role_id`).run(guildId, roleId);
    }
};
export const infractions = {
    add(db, input) {
        const info = db
            .prepare('INSERT INTO infractions (guild_id, user_id, mod_id, type, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(input.guildId, input.userId, input.modId, input.type, input.reason ?? null, Date.now());
        return info.lastInsertRowid;
    }
};
//# sourceMappingURL=db.js.map