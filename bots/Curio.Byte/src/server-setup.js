const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const logChannels = new Map();

async function setupGuild(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ You need Administrator permissions to run this setup.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;

  try {
    let adminCategory = guild.channels.cache.find(
      c => c.name === '🔒 Admin & Logs' && c.type === ChannelType.GuildCategory
    );

    if (!adminCategory) {
      adminCategory = await guild.channels.create({
        name: '🔒 Admin & Logs',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
        ],
      });
    }

    let logsChannel = guild.channels.cache.find(
      c => c.name === 'logs' && c.parentId === adminCategory.id
    );

    if (!logsChannel) {
      logsChannel = await guild.channels.create({
        name: 'logs',
        type: ChannelType.GuildText,
        parent: adminCategory.id,
        topic: 'Automated audit logs for Curio.Byte server monitoring and moderation.',
      });
    }

    logChannels.set(guild.id, logsChannel.id);

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Curio.Byte Setup Complete')
      .setDescription('Administrative category and audit logging channel have been successfully configured.')
      .addFields(
        { name: 'Log Channel', value: `<#${logsChannel.id}>`, inline: true },
        { name: 'Category', value: '🔒 Admin & Logs', inline: true }
      )
      .setColor(0x00FF99)
      .setTimestamp();

    await logsChannel.send({ embeds: [EmbedBuilder.from(embed).setTitle('🛡️ Audit Logging Initialized').setDescription('Curio.Byte is now actively monitoring server events.')] });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error during guild setup:', error);
    await interaction.editReply({ content: `❌ Failed to complete setup: ${error.message}` });
  }
}

function getLogChannel(guild) {
  if (logChannels.has(guild.id)) {
    return guild.channels.cache.get(logChannels.get(guild.id));
  }
  return guild.channels.cache.find(c => c.name === 'logs' && c.type === ChannelType.GuildText);
}

async function sendLog(guild, embed) {
  const channel = getLogChannel(guild);
  if (!channel) return;
  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send audit log:', err);
  }
}

function attachAuditLogging(client) {
  client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message Deleted')
      .setDescription(`A message by **${message.author.tag}** was deleted in <#${message.channel.id}>.`)
      .addFields({ name: 'Content', value: message.content || '*[Embed or Attachment]*' })
      .setColor(0xFF3333)
      .setTimestamp();

    await sendLog(message.guild, embed);
  });

  client.on('guildMemberAdd', async member => {
    const embed = new EmbedBuilder()
      .setTitle('📥 Member Joined')
      .setDescription(`**${member.user.tag}** joined the server.`)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x00FF99)
      .setTimestamp();

    await sendLog(member.guild, embed);
  });

  client.on('guildMemberRemove', async member => {
    const embed = new EmbedBuilder()
      .setTitle('📤 Member Left')
      .setDescription(`**${member.user.tag}** left the server.`)
      .setColor(0xFFA500)
      .setTimestamp();

    await sendLog(member.guild, embed);
  });
}

module.exports = { setupGuild, sendLog, attachAuditLogging };
