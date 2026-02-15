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
import { AutoModerationActionType, AutoModerationRuleEventType, AutoModerationRuleTriggerType, PermissionFlagsBits } from 'discord.js';
// Minimal AutoMod management (keyword rules)
let UserCommand = (() => {
    let _classDecorators = [ApplyOptions({
            description: 'Manage Discord AutoMod rules (minimal)',
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
                .setName('automod')
                .setDescription('AutoMod rules')
                .addSubcommand((sc) => sc.setName('list').setDescription('List AutoMod rules'))
                .addSubcommand((sc) => sc
                .setName('keyword')
                .setDescription('Create a keyword AutoMod rule')
                .addStringOption((o) => o.setName('name').setDescription('Rule name').setRequired(true))
                .addStringOption((o) => o
                .setName('keywords')
                .setDescription('Comma-separated keywords (e.g. scam, nitro, free)')
                .setRequired(true))
                .addBooleanOption((o) => o.setName('enabled').setDescription('Enabled?').setRequired(false)))
                .addSubcommand((sc) => sc
                .setName('delete')
                .setDescription('Delete an AutoMod rule')
                .addStringOption((o) => o.setName('rule_id').setDescription('Rule ID').setRequired(true))));
        }
        async chatInputRun(interaction) {
            if (!interaction.inCachedGuild())
                return interaction.reply({ content: 'Guild only.', ephemeral: true });
            const sub = interaction.options.getSubcommand(true);
            if (sub === 'list') {
                const rules = await interaction.guild.autoModerationRules.fetch().catch(() => null);
                if (!rules)
                    return interaction.reply({ content: 'Could not fetch rules.', ephemeral: true });
                const lines = [...rules.values()].map((r) => `• ${r.name} — id: ${r.id} — ${r.enabled ? 'enabled' : 'disabled'}`);
                return interaction.reply({ content: lines.length ? lines.join('\n') : 'No AutoMod rules found.', ephemeral: true });
            }
            if (sub === 'keyword') {
                const name = interaction.options.getString('name', true);
                const keywords = interaction.options
                    .getString('keywords', true)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                const enabled = interaction.options.getBoolean('enabled') ?? true;
                const rule = await interaction.guild.autoModerationRules.create({
                    name,
                    enabled,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { keywordFilter: keywords },
                    actions: [{ type: AutoModerationActionType.BlockMessage }]
                });
                return interaction.reply({ content: `Created AutoMod rule: ${rule.name} (id: ${rule.id})`, ephemeral: true });
            }
            if (sub === 'delete') {
                const id = interaction.options.getString('rule_id', true);
                await interaction.guild.autoModerationRules.delete(id).catch(() => null);
                return interaction.reply({ content: `Deleted rule (if it existed): ${id}`, ephemeral: true });
            }
            return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
        }
    };
    return UserCommand = _classThis;
})();
export { UserCommand };
//# sourceMappingURL=automod.js.map