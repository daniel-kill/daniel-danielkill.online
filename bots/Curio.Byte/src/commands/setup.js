const { SlashCommandBuilder } = require('discord.js');
const { setupGuild } = require('../server-setup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('curio-byte')
    .setDescription('Curio.Byte administrative commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Provision private admin category and enable audit logging')
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'setup') {
      await setupGuild(interaction);
    }
  },
};
