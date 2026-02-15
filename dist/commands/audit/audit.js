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
import { PermissionFlagsBits } from 'discord.js';
let UserCommand = (() => {
    let _classDecorators = [ApplyOptions({
            description: 'View recent audit log entries (quick dashboard)',
            requiredUserPermissions: [PermissionFlagsBits.ViewAuditLog]
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
                .setName('audit')
                .setDescription('Audit log tools')
                .addSubcommand((sc) => sc
                .setName('recent')
                .setDescription('Show recent audit log entries')
                .addIntegerOption((o) => o.setName('limit').setDescription('Max entries (1-20)').setMinValue(1).setMaxValue(20))));
        }
        async chatInputRun(interaction) {
            if (!interaction.inCachedGuild())
                return interaction.reply({ content: 'Guild only.', ephemeral: true });
            const limit = interaction.options.getInteger('limit') ?? 10;
            const logs = await interaction.guild.fetchAuditLogs({ limit }).catch(() => null);
            if (!logs)
                return interaction.reply({ content: 'Could not fetch audit logs.', ephemeral: true });
            const lines = logs.entries.map((e) => {
                const actor = e.executor ? `${e.executor.tag}` : 'Unknown';
                const target = e.target ? (typeof e.target === 'string' ? e.target : e.target.id ?? '') : '';
                const reason = e.reason ? ` — ${e.reason}` : '';
                return `• **${e.action}** by **${actor}** ${target ? `(target ${target})` : ''}${reason}`;
            });
            return interaction.reply({ content: lines.length ? lines.join('\n') : 'No entries.', ephemeral: true });
        }
    };
    return UserCommand = _classThis;
})();
export { UserCommand };
//# sourceMappingURL=audit.js.map