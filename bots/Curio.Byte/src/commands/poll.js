const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
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
        .setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const opt1 = interaction.options.getString('option1') || 'Yes';
    const opt2 = interaction.options.getString('option2') || 'No';

    let votesOpt1 = 0;
    let votesOpt2 = 0;
    const voters = new Set();

    const createEmbed = (isClosed = false) => {
      const total = votesOpt1 + votesOpt2;
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
        .setFooter({ text: `Created by ${interaction.user.tag}` })
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('poll_opt1')
        .setLabel(opt1)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('poll_opt2')
        .setLabel(opt2)
        .setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.reply({
      embeds: [createEmbed()],
      components: [row],
      fetchReply: true
    });

    // Create collector active for 5 minutes (300,000 ms)
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async i => {
      if (voters.has(i.user.id)) {
        await i.reply({ content: ' You have already voted in this poll!', flags: 64 });
        return;
      }

      voters.add(i.user.id);
      if (i.customId === 'poll_opt1') votesOpt1++;
      if (i.customId === 'poll_opt2') votesOpt2++;

      await i.update({ embeds: [createEmbed()] });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('poll_opt1')
          .setLabel(opt1)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('poll_opt2')
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
};
