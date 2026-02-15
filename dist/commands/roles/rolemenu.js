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
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, Role, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
// Simple role menu using a StringSelectMenu
// Stores config in role_menus.json field in sqlite for later editing (MVP stores only message id).
let UserCommand = (() => {
    let _classDecorators = [ApplyOptions({
            description: 'Create a self-assignable role menu',
            requiredUserPermissions: [PermissionFlagsBits.ManageRoles]
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
                .setName('rolemenu')
                .setDescription('Role menu tools')
                .addSubcommand((sc) => sc
                .setName('create')
                .setDescription('Create a role menu (select roles)')
                .addStringOption((o) => o.setName('title').setDescription('Menu title').setRequired(true))
                .addStringOption((o) => o.setName('description').setDescription('Menu description').setRequired(false))
                .addRoleOption((o) => o.setName('role1').setDescription('Role option 1').setRequired(true))
                .addRoleOption((o) => o.setName('role2').setDescription('Role option 2').setRequired(false))
                .addRoleOption((o) => o.setName('role3').setDescription('Role option 3').setRequired(false))
                .addRoleOption((o) => o.setName('role4').setDescription('Role option 4').setRequired(false))
                .addRoleOption((o) => o.setName('role5').setDescription('Role option 5').setRequired(false))));
        }
        async chatInputRun(interaction) {
            if (!interaction.inCachedGuild())
                return interaction.reply({ content: 'Guild only.', ephemeral: true });
            const title = interaction.options.getString('title', true);
            const description = interaction.options.getString('description') ?? 'Select roles to toggle.';
            const roles = [];
            for (const k of ['role1', 'role2', 'role3', 'role4', 'role5']) {
                const r = interaction.options.getRole(k);
                if (r && r instanceof Role)
                    roles.push(r);
            }
            const menu = new StringSelectMenuBuilder()
                .setCustomId('rolemenu:toggle')
                .setMinValues(0)
                .setMaxValues(Math.min(roles.length, 10))
                .setPlaceholder('Select roles to toggle')
                .addOptions(roles.map((r) => new StringSelectMenuOptionBuilder().setLabel(r.name).setValue(r.id)));
            const row = new ActionRowBuilder().addComponents(menu);
            const msg = await interaction.channel?.send({ content: `**${title}**\n${description}`, components: [row] });
            if (msg) {
                container.db
                    .prepare('INSERT INTO role_menus (guild_id, channel_id, message_id, title, description, json) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(interaction.guildId, interaction.channelId, msg.id, title, description, JSON.stringify({ roles: roles.map((r) => ({ id: r.id, name: r.name })) }));
            }
            return interaction.reply({ content: 'Role menu created.', ephemeral: true });
        }
    };
    return UserCommand = _classThis;
})();
export { UserCommand };
//# sourceMappingURL=rolemenu.js.map