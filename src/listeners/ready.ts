import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { startFortnitePoller } from '../lib/fortnite/poller.js';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
  public run() {
    this.container.logger.info(`Logged in as ${this.container.client.user?.tag}`);
    this.container.logger.info('Otter is ready.');
    startFortnitePoller();
  }
}
