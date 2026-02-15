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
import { container } from '@sapphire/framework';
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
        async run(interaction, ticketId) {
            if (!interaction.inCachedGuild())
                return;
            const row = container.db.prepare('SELECT * FROM tickets WHERE id=? AND guild_id=?').get(ticketId, interaction.guildId);
            if (!row)
                return interaction.reply({ content: 'Ticket not found.', ephemeral: true });
            container.db.prepare('UPDATE tickets SET status=?, closed_at=? WHERE id=?').run('closed', Date.now(), ticketId);
            await interaction.reply({ content: 'Closing ticket…', ephemeral: true });
            const ch = interaction.channel;
            setTimeout(() => ch.delete('Ticket closed').catch(() => null), 1500);
        }
        async parse(interaction) {
            if (!interaction.isButton())
                return this.none();
            if (!interaction.customId.startsWith('ticket:close:'))
                return this.none();
            const parts = interaction.customId.split(':');
            const ticketId = Number(parts[2]);
            if (!Number.isFinite(ticketId))
                return this.none();
            return this.some(ticketId);
        }
    };
    return UserInteractionHandler = _classThis;
})();
export { UserInteractionHandler };
//# sourceMappingURL=ticketClose.js.map