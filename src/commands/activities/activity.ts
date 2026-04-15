import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, type VoiceChannel } from 'discord.js';

/**
 * Discord Embedded Application IDs for Activities.
 * These launch inside voice channels — useful where Discord
 * voice/video calls are blocked (e.g. UAE).
 */
const ACTIVITIES: Record<string, { id: string; name: string }> = {
  youtube: { id: '880218394199220334', name: 'Watch Together' },
  poker: { id: '755827207812677713', name: 'Poker Night' },
  betrayal: { id: '773336526917861400', name: 'Betrayal.io' },
  fishing: { id: '814288819477020702', name: 'Fishington.io' },
  chess: { id: '832012774040141894', name: 'Chess in the Park' },
  letter_league: { id: '879863686565621790', name: 'Letter League' },
  word_snacks: { id: '879863976006127627', name: 'Word Snacks' },
  sketch_heads: { id: '902271654783242291', name: 'Sketch Heads' },
  spellcast: { id: '852509694341283871', name: 'SpellCast' },
  checkers: { id: '832013003968348200', name: 'Checkers in the Park' },
  putt_party: { id: '945737671223947305', name: 'Putt Party' },
  land_io: { id: '903769130790969345', name: 'Land.io' },
  bobble_league: { id: '947957217959759964', name: 'Bobble League' },
  ask_away: { id: '976052223358406656', name: 'Ask Away' },
  know_what_i_meme: { id: '950505761862189096', name: 'Know What I Meme' },
  gartic_phone: { id: '1007373802981822582', name: 'Gartic Phone' }
};

const ACTIVITY_CHOICES = Object.entries(ACTIVITIES).map(([key, val]) => ({
  name: val.name,
  value: key
}));

@ApplyOptions<Command.Options>({
  description: 'Launch a Discord Activity in a voice channel'
})
export class ActivityCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('activity')
        .setDescription('Launch a Discord Activity in a voice channel')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Voice channel to launch the activity in')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('activity')
            .setDescription('Which activity to launch')
            .setRequired(true)
            .addChoices(...ACTIVITY_CHOICES)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    }

    const channel = interaction.options.getChannel('channel', true) as VoiceChannel;
    const activityKey = interaction.options.getString('activity', true);
    const activity = ACTIVITIES[activityKey];

    if (!activity) {
      return interaction.reply({ content: 'Unknown activity.', flags: 64 });
    }

    try {
      // Create an invite with target_type 2 (Embedded Application)
      const invite = await channel.createInvite({
        maxAge: 0,
        targetType: 2,
        targetApplication: activity.id
      });

      return interaction.reply({
        content: `🎮 **${activity.name}** is ready!\n\n👉 [Click here to join](https://discord.gg/${invite.code}) in **${channel.name}**`
      });
    } catch (err) {
      return interaction.reply({
        content: 'Failed to create the activity invite. Make sure I have **Create Invite** permission in that channel.',
        flags: 64
      });
    }
  }
}
