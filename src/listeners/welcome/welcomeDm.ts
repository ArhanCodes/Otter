import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: 'guildMemberAdd' })
export class UserEvent extends Listener {
  public async run(member: GuildMember) {
    // Minimal welcome screen: DM new members.
    await member
      .send(
        `Welcome to **${member.guild.name}**!\n\nTip: check the server channels for rules, roles, and how to get support.`
      )
      .catch(() => null);
  }
}
