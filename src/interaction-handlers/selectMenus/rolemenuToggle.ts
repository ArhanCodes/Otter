import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { StringSelectMenuInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class UserInteractionHandler extends InteractionHandler {
  public override async run(interaction: StringSelectMenuInteraction) {
    if (!interaction.inCachedGuild()) return;

    const selectedRoleIds = interaction.values;
    const member = interaction.member;

    // Toggle: if member has role, remove it; else add it.
    const ops: Promise<any>[] = [];
    for (const roleId of selectedRoleIds) {
      const has = member.roles.cache.has(roleId);
      ops.push(has ? member.roles.remove(roleId) : member.roles.add(roleId));
    }

    await Promise.allSettled(ops);
    await interaction.reply({ content: 'Updated your roles.', ephemeral: true });
  }

  public override async parse(interaction: StringSelectMenuInteraction) {
    if (!interaction.isStringSelectMenu()) return this.none();
    if (interaction.customId !== 'rolemenu:toggle') return this.none();
    return this.some();
  }
}
