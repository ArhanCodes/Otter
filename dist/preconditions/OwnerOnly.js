import { AllFlowsPrecondition } from '@sapphire/framework';
import { ownersList } from '../env.js';
export class UserPrecondition extends AllFlowsPrecondition {
    #message = 'This command can only be used by the bot owner.';
    chatInputRun(interaction) {
        return this.doOwnerCheck(interaction.user.id);
    }
    contextMenuRun(interaction) {
        return this.doOwnerCheck(interaction.user.id);
    }
    messageRun(message) {
        return this.doOwnerCheck(message.author.id);
    }
    doOwnerCheck(userId) {
        return ownersList().includes(userId) ? this.ok() : this.error({ message: this.#message });
    }
}
//# sourceMappingURL=OwnerOnly.js.map