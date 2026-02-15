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
import { container } from '@sapphire/framework';
import { guildSettings, infractions } from '../../db.js';
import { sendModLog } from '../../lib/modLog.js';
let UserCommand = (() => {
    let _classDecorators = [ApplyOptions({
            description: 'Mute a member (adds a configured mute role)',
            requiredUserPermissions: [PermissionFlagsBits.ModerateMembers]
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
                .setName('mute')
                .setDescription('Mute a member (requires /config muterole)')
                .addUserOption((o) => o.setName('user').setDescription('User to mute').setRequired(true))
                .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)));
        }
        async chatInputRun(interaction) {
            if (!interaction.inCachedGuild())
                return interaction.reply({ content: 'Guild only.', ephemeral: true });
            const user = interaction.options.getUser('user', true);
            const reason = interaction.options.getString('reason');
            const settings = guildSettings.get(container.db, interaction.guildId);
            const muteRoleId = settings.mute_role_id;
            if (!muteRoleId)
                return interaction.reply({ content: 'Mute role not set. Run `/config muterole` first.', ephemeral: true });
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member)
                return interaction.reply({ content: 'User not in this guild.', ephemeral: true });
            await member.roles.add(muteRoleId, reason ?? undefined);
            infractions.add(container.db, { guildId: interaction.guildId, userId: user.id, modId: interaction.user.id, type: 'mute', reason });
            await sendModLog({
                db: container.db,
                guild: interaction.guild,
                title: 'Member muted',
                description: `${user.tag} was muted by ${interaction.user.tag}`,
                fields: reason ? [{ name: 'Reason', value: reason }] : undefined
            });
            return interaction.reply({ content: `Muted **${user.tag}**`, ephemeral: true });
        }
    };
    return UserCommand = _classThis;
})();
export { UserCommand };
//# sourceMappingURL=mute.js.map