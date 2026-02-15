> No longer hosted, feel free to self-host

![Otter Banner](assets/otter.png)

# Otter
Built with Sapphire Framework + discord.js v14. It’s designed to be easy to self-host and extend (similar philosophy to Zeppelin)

## Features

### Self-host foundation
- TypeScript (builds to `dist/`)
- Sapphire Framework + discord.js v14
- Environment validation (`zod`) + `.env.example`
- SQLite persistence (`better-sqlite3`) with simple migrations
- Docker + docker-compose for one-command deploy

### Moderation
- `/kick` — kick a member (stores an infraction + posts to mod log)
- `/ban` — ban a user (stores an infraction + posts to mod log)
- `/mute` — mute a member by applying a configured mute role (stores an infraction + posts to mod log)

### Server configuration
- `/config modlog` — set the moderation log channel
- `/config muterole` — set the mute role used by `/mute`

### Mod log / auditing
- Rich embed mod logs to a configured channel
- Infraction records saved to SQLite (`infractions` table)

### Additional
- Anti-raid: join spike detection + auto quarantine role (`/antiraid ...` + listener)
- AutoMod management: list/create/delete basic keyword rules (`/automod ...`)
- Role menus: self-assignable roles via select menu (`/rolemenu create`)
- Welcome screens: basic welcome DM on join (listener)
- Tickets: setup + panel + private channels + transcript file stored in SQLite (`/ticket setup`, `/ticket panel`)
- Audit log view: quick “dashboard” of recent audit log entries (`/audit recent`)
- Backups/export: export guild config + role menus + ticket config to JSON (`/backup export`)

### Developer experience
- `npm run dev` hot-reloads using `tsx watch`
- `npm run build` compiles TypeScript
- Clean structure (`src/commands`, `src/listeners`, `src/lib`, `src/db`)

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


