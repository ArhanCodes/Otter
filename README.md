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

## Features (advanced modules included)

These are implemented as lightweight MVP modules you can extend:
- ✅ **Anti-raid**: join spike detection + auto quarantine role (`/antiraid ...` + listener)
- ✅ **AutoMod management**: list/create/delete basic keyword rules (`/automod ...`)
- ✅ **Role menus**: self-assignable roles via select menu (`/rolemenu create`)
- ✅ **Welcome screens**: basic welcome DM on join (listener)
- ✅ **Tickets**: setup + panel + private channels + transcript file stored in SQLite (`/ticket setup`, `/ticket panel`)
- ✅ **Audit log view**: quick “dashboard” of recent audit log entries (`/audit recent`)
- ✅ **Backups/export**: export guild config + role menus + ticket config to JSON (`/backup export`)

## “Most powerful” roadmap (next upgrades)
- Anti-raid: auto lockdown (disable invites, slowmode) + timed release from quarantine
- AutoMod: more trigger types + alert channel + bypass roles
- Tickets: add claim/assign + close reasons + transcript uploads to S3
- Dashboard: web dashboard (Next.js) reading SQLite/Postgres
- Backup: import/restore + scheduled backups

## Access to the hosted bot
This repository is for **self-hosting**.

If you want access to the **official hosted Otter bot** (the one I run), message me on Discord:
- **@arhan.424**

(If you’re forking this, replace the line above with your own Discord contact.)

---

Security note: keep your `.env` private.
