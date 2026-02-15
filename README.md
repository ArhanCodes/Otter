# Otter (Self‑Hostable) — Powerful Discord Bot Starter

This is a **general purpose** Discord bot built with **Sapphire Framework** + **discord.js v14**.
It’s designed to be easy to self-host and extend (similar philosophy to bots like Zeppelin: modular, permissioned, logged).

## Features (included)

### Self-host foundation
- ✅ TypeScript (builds to `dist/`)
- ✅ Sapphire Framework + discord.js v14
- ✅ Environment validation (`zod`) + `.env.example`
- ✅ SQLite persistence (`better-sqlite3`) with simple migrations
- ✅ Docker + docker-compose for one-command deploy

### Moderation (slash commands)
- ✅ `/kick` — kick a member (stores an infraction + posts to mod log)
- ✅ `/ban` — ban a user (stores an infraction + posts to mod log)
- ✅ `/mute` — mute a member by applying a configured mute role (stores an infraction + posts to mod log)

### Server configuration
- ✅ `/config modlog` — set the moderation log channel
- ✅ `/config muterole` — set the mute role used by `/mute`

### Mod log / auditing
- ✅ Rich embed mod logs to a configured channel
- ✅ Infraction records saved to SQLite (`infractions` table)

### Developer experience
- ✅ `npm run dev` hot-reloads using `tsx watch`
- ✅ `npm run build` compiles TypeScript
- ✅ Clean structure (`src/commands`, `src/listeners`, `src/lib`, `src/db`)

## Self-host

### 1) Create a Discord application
- Developer Portal → New application → Bot → **reset token**
- Enable Privileged Gateway Intents if you need them later
- Invite URL: OAuth2 → URL Generator → scopes: `bot`, `applications.commands`

### 2) Configure

Copy `.env.example` to `.env` and fill:

```bash
cp .env.example .env
```

Required:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `OWNERS` (comma-separated user IDs)

### 3) Run

Dev:
```bash
npm install
npm run dev
```

Production:
```bash
npm install
npm run build
npm start
```

Docker:
```bash
docker compose up -d --build
```

## Extending (how to add features)
- Add a new command file under `src/commands/...`
- Add listeners under `src/listeners/...`
- Store config / data via `src/db.ts`

## “Most powerful” roadmap (suggested next modules)
If you want this to rival Zeppelin-like capabilities, add:
- Anti-raid (join rate limits + auto quarantine)
- AutoMod rules management
- Role menus + welcome screens
- Ticket system + transcript storage
- Audit log syncing + mod actions dashboard
- Backups/export of config

## Access to the hosted bot
This repository is for **self-hosting**.

If you want access to the **official hosted Otter bot** (the one I run), message me on Discord:
- **@arhan.424**

(If you’re forking this, replace the line above with your own Discord contact.)

---

Security note: keep your `.env` private.
