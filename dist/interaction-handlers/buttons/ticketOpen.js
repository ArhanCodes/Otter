var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
function nextName(n) {
    return `ticket-${String(n).padStart(4, '0')}`;
}
let UserInteractionHandler = (() => {
    let _classDecorators = [ApplyOptions({
            interactionHandlerType: InteractionHandlerTypes.Button
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = InteractionHandler;
    var UserInteractionHandler = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            UserInteractionHandler = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async run(interaction) {
            if (!interaction.inCachedGuild())
                return;
            const cfg = container.db.prepare('SELECT * FROM ticket_config WHERE guild_id=?').get(interaction.guildId);
            if (!cfg?.category_id || !cfg?.support_role_id) {
                return interaction.reply({ content: 'Ticket system not configured. Run `/ticket setup`.', ephemeral: true });
            }
            const countRow = container.db.prepare('SELECT COUNT(*) as c FROM tickets WHERE guild_id=?').get(interaction.guildId);
            const n = (countRow?.c ?? 0) + 1;
            const channel = await interaction.guild.channels.create({
                name: nextName(n),
                type: ChannelType.GuildText,
                parent: cfg.category_id,
                permissionOverwrites: [
                    { id: interaction.guildId, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: cfg.support_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            });
            const ticketId = container.db
                .prepare('INSERT INTO tickets (guild_id, channel_id, opener_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
                .run(interaction.guildId, channel.id, interaction.user.id, 'open', Date.now()).lastInsertRowid;
            const controls = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket:close:${ticketId}`).setLabel('Close').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId(`ticket:transcript:${ticketId}`).setLabel('Transcript').setStyle(ButtonStyle.Secondary));
            await channel.send({
                content: `Ticket opened by <@${interaction.user.id}>. Support will be with you shortly.\n\nUse the buttons below when done.`,
                components: [controls]
            });
            return interaction.reply({ content: `Created ticket: <#${channel.id}>`, ephemeral: true });
        }
        async parse(interaction) {
            if (!interaction.isButton())
                return this.none();
            if (interaction.customId !== 'ticket:open')
                return this.none();
            return this.some();
        }
    };
    return UserInteractionHandler = _classThis;
})();
export { UserInteractionHandler };
//# sourceMappingURL=ticketOpen.js.map