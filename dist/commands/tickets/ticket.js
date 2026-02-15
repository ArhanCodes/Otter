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
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
let UserCommand = (() => {
    let _classDecorators = [ApplyOptions({
            description: 'Ticket system (setup + panel)',
            requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Command;
    var UserCommand = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            UserCommand = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        registerApplicationCommands(registry) {
            registry.registerChatInputCommand((builder) => builder
                .setName('ticket')
                .setDescription('Ticket system')
                .addSubcommand((sc) => sc
                .setName('setup')
                .setDescription('Configure tickets')
                .addChannelOption((o) => o
                .setName('category')
                .setDescription('Category where tickets will be created')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true))
                .addRoleOption((o) => o.setName('support_role').setDescription('Support role that can see tickets').setRequired(true)))
                .addSubcommand((sc) => sc.setName('panel').setDescription('Post a ticket panel button')));
        }
        async chatInputRun(interaction) {
            if (!interaction.inCachedGuild())
                return interaction.reply({ content: 'Guild only.', ephemeral: true });
            const sub = interaction.options.getSubcommand(true);
            if (sub === 'setup') {
                const category = interaction.options.getChannel('category', true);
                const supportRole = interaction.options.getRole('support_role', true);
                container.db
                    .prepare(`INSERT INTO ticket_config (guild_id, category_id, support_role_id)
           VALUES (?, ?, ?)
           ON CONFLICT(guild_id) DO UPDATE SET category_id=excluded.category_id, support_role_id=excluded.support_role_id`)
                    .run(interaction.guildId, category.id, supportRole.id);
                return interaction.reply({ content: 'Ticket system configured.', ephemeral: true });
            }
            if (sub === 'panel') {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:open').setLabel('Open Ticket').setStyle(ButtonStyle.Primary));
                const msg = await interaction.channel?.send({
                    content: '**Support tickets**\nClick the button to open a private ticket channel.',
                    components: [row]
                });
                if (msg) {
                    container.db
                        .prepare(`INSERT INTO ticket_config (guild_id, panel_channel_id, panel_message_id)
             VALUES (?, ?, ?)
             ON CONFLICT(guild_id) DO UPDATE SET panel_channel_id=excluded.panel_channel_id, panel_message_id=excluded.panel_message_id`)
                        .run(interaction.guildId, interaction.channelId, msg.id);
                }
                return interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
            }
            return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
        }
    };
    return UserCommand = _classThis;
})();
export { UserCommand };
//# sourceMappingURL=ticket.js.map