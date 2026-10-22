const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const crypto = require('node:crypto');
const { createPoll, updatePollMessageId, closePoll, recordVote, hasVoted, getPollVotes } = require('../db');

const pollCommand = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create an interactive poll for the server')
  .addStringOption(option =>
    option.setName('question')
      .setDescription('The question/topic for the poll')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('option1')
      .setDescription('First choice option')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('option2')
      .setDescription('Second choice option')
      .setRequired(false));

async function handlePollCommand(interaction) {
  const question = interaction.options.getString('question', true);
  const opt1 = interaction.options.getString('option1') || 'Yes';
  const opt2 = interaction.options.getString('option2') || 'No';

  // Generate unique poll identifier
  const pollId = crypto.randomUUID();

  // Persist poll definition into SQLite
  try {
    createPoll(pollId, interaction.guildId, interaction.channelId, null, question, opt1, opt2, interaction.user.id);
  } catch (err) {
    console.error('Failed to persist poll creation:', err);
  }

  const createEmbed = (isClosed = false) => {
    let votesOpt1 = 0;
    let votesOpt2 = 0;
    let total = 0;

    try {
      const stats = getPollVotes(pollId);
      votesOpt1 = stats.votesOpt1;
      votesOpt2 = stats.votesOpt2;
      total = stats.totalVotes;
    } catch (err) {
      console.error('Failed to fetch poll vote counts:', err);
    }

    const pct1 = total > 0 ? Math.round((votesOpt1 / total) * 100) : 0;
    const pct2 = total > 0 ? Math.round((votesOpt2 / total) * 100) : 0;

    return new EmbedBuilder()
      .setTitle(`📊 Poll: ${question}`)
      .setColor(isClosed ? 0x95a5a6 : 0x3498db)
      .setDescription(
        `**${opt1}**: ${votesOpt1} vote(s) (${pct1}%)\n` +
        `**${opt2}**: ${votesOpt2} vote(s) (${pct2}%)\n\n` +
        `*Total Votes:* ${total}` +
        (isClosed ? '\n\n🔒 **This poll is now closed.**' : '')
      )
      .setFooter({ text: `Created by ${interaction.user.tag} · Poll ID: ${pollId.slice(0, 8)}` })
      .setTimestamp();
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`poll_opt1_${pollId}`)
      .setLabel(opt1)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`poll_opt2_${pollId}`)
      .setLabel(opt2)
      .setStyle(ButtonStyle.Secondary)
  );

  const response = await interaction.reply({
    embeds: [createEmbed()],
    components: [row],
    fetchReply: true
  });

  try {
    updatePollMessageId(pollId, response.id);
  } catch (err) {
    console.error('Failed to link poll message ID:', err);
  }

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000 // 5 minutes active duration
  });

  collector.on('collect', async i => {
    try {
      const alreadyVoted = hasVoted(pollId, i.user.id);
      if (alreadyVoted) {
        await i.reply({ content: 'You have already voted in this poll!', ephemeral: true });
        return;
      }

      const choice = i.customId.startsWith('poll_opt1') ? 1 : 2;
      recordVote(pollId, i.user.id, choice);

      await i.update({ embeds: [createEmbed()] });
    } catch (err) {
      console.error('Failed to record poll vote:', err);
      await i.reply({ content: 'An error occurred recording your vote.', ephemeral: true }).catch(() => {});
    }
  });

  collector.on('end', async () => {
    try {
      closePoll(pollId);
    } catch (err) {
      console.error('Failed to set poll as closed in DB:', err);
    }

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`poll_opt1_${pollId}`)
        .setLabel(opt1)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`poll_opt2_${pollId}`)
        .setLabel(opt2)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    await interaction.editReply({
      embeds: [createEmbed(true)],
      components: [disabledRow]
    }).catch(() => {});
  });
}

module.exports = { pollCommand, handlePollCommand };
