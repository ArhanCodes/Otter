import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { container } from '@sapphire/framework';
import { guildSettings } from '../../db.js';
import { sendModLog } from '../../lib/modLog.js';

// Simple join-rate anti-raid:
// - counts joins in the last 60 seconds
// - if threshold exceeded, apply quarantine role to new joins

const recentJoins: Map<string, number[]> = new Map();

@ApplyOptions<Listener.Options>({ event: 'guildMemberAdd' })
export class UserEvent extends Listener {
  public async run(member: GuildMember) {
    const settings = guildSettings.get(container.db, member.guild.id);
    const enabled = Boolean(settings.anti_raid_enabled);
    const threshold = Number(settings.anti_raid_joins_per_min ?? 6);
    const quarantineRoleId = settings.quarantine_role_id as string | null;

    if (!enabled) return;

    const now = Date.now();
    const key = member.guild.id;
    const arr = recentJoins.get(key) ?? [];
    const next = arr.filter((t) => now - t < 60_000);
    next.push(now);
    recentJoins.set(key, next);

    if (next.length >= threshold && quarantineRoleId) {
      await member.roles.add(quarantineRoleId, 'Anti-raid quarantine').catch(() => null);
      await sendModLog({
        db: container.db,
        guild: member.guild,
        title: 'Anti-raid quarantine applied',
        description: `${member.user.tag} joined during a join spike (${next.length} joins/min).`,
        fields: [{ name: 'Quarantine role', value: `<@&${quarantineRoleId}>` }]
      });
    }
  }
}
