import '@sapphire/plugin-logger/register';
import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import { env, ownersList } from './env.js';
import { openDb } from './db.js';
import { container } from '@sapphire/framework';
container.db = openDb();
const client = new SapphireClient({
    defaultPrefix: env.DEFAULT_PREFIX,
    logger: {
        level: LogLevel[env.LOG_LEVEL.toUpperCase()] ?? LogLevel.Info
    },
    shards: 'auto',
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel]
});
async function main() {
    try {
        client.logger.info('Starting bot…');
        await client.login(env.DISCORD_TOKEN);
    }
    catch (err) {
        client.logger.fatal(err);
        client.destroy();
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map