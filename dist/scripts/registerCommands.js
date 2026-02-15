import { REST, Routes } from 'discord.js';
import { env } from '../env.js';
// Simple global command registration.
// If you want faster iteration, register to a single guild instead.
const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
async function main() {
    // For Sapphire, commands are built at runtime by scanning ./src/commands.
    // The simplest self-host flow is: run the bot once (so it loads commands),
    // then export them from client.stores.
    // This script is left as a placeholder.
    console.log('Sapphire registers commands automatically when you start the bot if you enable application command registration.');
    console.log('If you want a dedicated registration script, tell me and I will wire it to Sapphire’s registry.');
    // Keeping the file so newcomers see where to add registration.
    void rest;
    void Routes;
}
main();
//# sourceMappingURL=registerCommands.js.map