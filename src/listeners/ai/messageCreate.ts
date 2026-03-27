import { ApplyOptions } from '@sapphire/decorators';
import { Listener, container } from '@sapphire/framework';
import { Message } from 'discord.js';
import { aiConfig, aiMessages } from '../../db.js';
import { env } from '../../env.js';
import { generateResponse, splitMessage } from '../../lib/ai/chat.js';

@ApplyOptions<Listener.Options>({ event: 'messageCreate' })
export class AiChatListener extends Listener {
  public async run(message: Message) {
    if (message.author.bot || !message.guild) return;
    if (!env.AI_API_KEY) return;

    const mentionRegex = new RegExp(`<@!?${message.client.user!.id}>`);
    const isMentioned = mentionRegex.test(message.content);
    const isReplyToBot = message.reference?.messageId
      ? await this.isReplyToBot(message)
      : false;

    if (!isMentioned && !isReplyToBot) return;

    const db = container.db;
    const config = aiConfig.get(db, message.guild.id);

    if (!config.enabled) return;

    // Strip the bot mention from the message content
    const content = message.content.replace(mentionRegex, '').trim();
    if (!content && !isReplyToBot) return;

    // Determine parent message for conversation threading
    let parentMessageId: string | null = null;
    if (message.reference?.messageId) {
      parentMessageId = message.reference.messageId;
    }

    // Save the user's message
    aiMessages.add(db, {
      guildId: message.guild.id,
      channelId: message.channel.id,
      userId: message.author.id,
      messageId: message.id,
      role: 'user',
      content: content || '(continued conversation)',
      parentMessageId
    });

    // Build conversation history
    const history = parentMessageId
      ? aiMessages.getConversation(db, message.id, config.max_history)
      : aiMessages.getRecentInChannel(db, message.channel.id, config.max_history);

    try {
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Keep typing indicator alive for long responses
      const typingInterval = setInterval(() => {
        if ('sendTyping' in message.channel) {
          (message.channel as any).sendTyping().catch(() => null);
        }
      }, 8000);

      const response = await generateResponse({
        config,
        history,
        userName: message.member?.displayName ?? message.author.username,
        serverName: message.guild.name,
        channelName: 'name' in message.channel ? (message.channel.name ?? 'DM') : 'DM'
      });

      clearInterval(typingInterval);

      const chunks = splitMessage(response);
      let lastSentId = message.id;

      for (const chunk of chunks) {
        const sent = await message.reply({
          content: chunk,
          allowedMentions: { repliedUser: false }
        });
        lastSentId = sent.id;

        // Only reply to the first chunk; send the rest as follow-ups
        if (chunks.indexOf(chunk) === 0) {
          // Save the bot's response with the user message as parent
          aiMessages.add(db, {
            guildId: message.guild.id,
            channelId: message.channel.id,
            userId: message.client.user!.id,
            messageId: sent.id,
            role: 'assistant',
            content: response,
            parentMessageId: message.id
          });
        }
      }
    } catch (err) {
      container.logger.error('AI chat error:', err);
      await message.reply('Something went wrong generating a response. Please try again.').catch(() => null);
    }
  }

  private async isReplyToBot(message: Message): Promise<boolean> {
    try {
      const ref = await message.channel.messages.fetch(message.reference!.messageId!);
      return ref.author.id === message.client.user!.id;
    } catch {
      return false;
    }
  }
}
