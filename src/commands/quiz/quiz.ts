import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { categories, type QuizQuestion } from './quizData.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const LEVEL_NAMES = ['Level 1 — Beginner', 'Level 2 — Intermediate', 'Level 3 — Advanced'];

@ApplyOptions<Command.Options>({
  description: 'Take a sustainability quiz'
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    const categoryChoices = categories.map((c, i) => ({ name: c.name, value: String(i) }));

    registry.registerChatInputCommand((builder) =>
      builder
        .setName('quiz')
        .setDescription('Take a sustainability quiz')
        .addStringOption((o) =>
          o
            .setName('category')
            .setDescription('Quiz category')
            .setRequired(true)
            .addChoices(...categoryChoices)
        )
        .addIntegerOption((o) =>
          o
            .setName('level')
            .setDescription('Difficulty level')
            .setRequired(true)
            .addChoices(
              { name: 'Level 1 — Beginner', value: 1 },
              { name: 'Level 2 — Intermediate', value: 2 },
              { name: 'Level 3 — Advanced', value: 3 }
            )
        )
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const categoryIndex = parseInt(interaction.options.getString('category', true));
    const level = interaction.options.getInteger('level', true);
    const category = categories[categoryIndex];

    if (!category) return interaction.reply({ content: 'Invalid category.', ephemeral: true });

    const questions = category.questions.filter((q) => q.level === level);
    if (questions.length === 0) return interaction.reply({ content: 'No questions found for this level.', ephemeral: true });

    await interaction.deferReply();

    let score = 0;
    let questionIndex = 0;

    for (const question of questions) {
      questionIndex++;
      const result = await this.askQuestion(interaction, question, questionIndex, questions.length, category.name, level, score);
      if (result === null) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Quiz Timed Out')
              .setDescription(`You didn't answer in time.\n\n**Score:** ${score}/${questionIndex - 1}`)
              .setColor(0xff6b6b)
          ],
          components: []
        });
        return;
      }
      if (result) score++;
    }

    const percentage = Math.round((score / questions.length) * 100);
    let resultMessage = 'Perfect score! Amazing!';
    if (percentage < 100) resultMessage = 'Great job!';
    if (percentage < 75) resultMessage = 'Good effort!';
    if (percentage < 50) resultMessage = 'Keep learning!';

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Quiz Complete!')
          .setDescription(
            `**Category:** ${category.name}\n` +
            `**Level:** ${LEVEL_NAMES[level - 1]}\n\n` +
            `**Score:** ${score}/${questions.length} (${percentage}%)\n\n` +
            resultMessage
          )
          .setColor(percentage >= 75 ? 0x2ecc71 : percentage >= 50 ? 0xf1c40f : 0xe74c3c)
      ],
      components: []
    });
  }

  private async askQuestion(
    interaction: ChatInputCommandInteraction,
    question: QuizQuestion,
    num: number,
    total: number,
    categoryName: string,
    level: number,
    currentScore: number
  ): Promise<boolean | null> {
    const embed = new EmbedBuilder()
      .setTitle(`Question ${num}/${total}`)
      .setDescription(`**${question.question}**\n\n${question.options.map((o, i) => `${LETTERS[i]}. ${o}`).join('\n')}`)
      .setFooter({ text: `${categoryName} | ${LEVEL_NAMES[level - 1]} | Score: ${currentScore}/${num - 1}` })
      .setColor(0x3498db);

    const buttons = question.options.map((_, i) =>
      new ButtonBuilder()
        .setCustomId(`quiz_${num}_${i}`)
        .setLabel(LETTERS[i])
        .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    await interaction.editReply({ embeds: [embed], components: [row] });

    try {
      const response = await interaction.channel!.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(`quiz_${num}_`),
        time: 30_000
      });

      const chosenIndex = parseInt(response.customId.split('_')[2]);
      const isCorrect = chosenIndex === question.correct;

      const resultEmbed = new EmbedBuilder()
        .setTitle(isCorrect ? 'Correct!' : 'Incorrect')
        .setDescription(
          `**${question.question}**\n\n` +
          (isCorrect
            ? `You chose **${LETTERS[chosenIndex]}. ${question.options[chosenIndex]}** — that's right!`
            : `You chose **${LETTERS[chosenIndex]}. ${question.options[chosenIndex]}**\nCorrect answer: **${LETTERS[question.correct]}. ${question.options[question.correct]}**`) +
          `\n\n${question.explanation}`
        )
        .setColor(isCorrect ? 0x2ecc71 : 0xe74c3c)
        .setFooter({ text: `${categoryName} | ${LEVEL_NAMES[level - 1]} | Question ${num}/${total}` });

      const disabledButtons = question.options.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`quiz_done_${num}_${i}`)
          .setLabel(LETTERS[i])
          .setStyle(i === question.correct ? ButtonStyle.Success : i === chosenIndex && !isCorrect ? ButtonStyle.Danger : ButtonStyle.Secondary)
          .setDisabled(true)
      );

      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButtons);

      await response.update({ embeds: [resultEmbed], components: [disabledRow] });

      await new Promise((r) => setTimeout(r, 3000));

      return isCorrect;
    } catch {
      return null;
    }
  }
}
