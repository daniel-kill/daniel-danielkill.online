const fs = require('node:fs/promises');
const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { BACKUP_ROOT } = require('../server-backup');

const analyticsCommand = new SlashCommandBuilder()
  .setName('analytics')
  .setDescription('View server metrics, member breakdowns, and backup analytics')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function getBackupStats(guildId) {
  try {
    const guildBackupDir = path.join(BACKUP_ROOT, guildId);
    const files = await fs.readdir(guildBackupDir);
    const backupFiles = files.filter(f => /^backup-.*\.json$/.test(f));
    
    if (backupFiles.length === 0) {
      return { totalBackups: 0, latestSizeKb: 0, oldestBackup: 'N/A' };
    }

    const latestFile = path.join(guildBackupDir, 'latest.json');
    const stats = await fs.stat(latestFile);
    const latestSizeKb = (stats.size / 1024).toFixed(1);

    const sortedFiles = backupFiles.sort();
    const oldestTimestamp = sortedFiles[0].replace('backup-', '').replace('.json', '').replaceAll('-', ':');

    return {
      totalBackups: backupFiles.length,
      latestSizeKb,
      oldestBackup: oldestTimestamp.slice(0, 10)
    };
  } catch {
    return { totalBackups: 0, latestSizeKb: 0, oldestBackup: 'N/A' };
  }
}

async function handleAnalyticsCommand(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const members = await guild.members.fetch();
  const totalMembers = members.size;
  const humans = members.filter(m => !m.user.bot).size;
  const bots = members.filter(m => m.user.bot).size;

  const channels = await guild.channels.fetch();
  const textChannels = channels.filter(c => c && c.type === ChannelType.GuildText).size;
  const voiceChannels = channels.filter(c => c && c.type === ChannelType.GuildVoice).size;
  const categories = channels.filter(c => c && c.type === ChannelType.GuildCategory).size;

  const roles = await guild.roles.fetch();
  const totalRoles = roles.size;

  const backupStats = await getBackupStats(guild.id);

  const embed = new EmbedBuilder()
    .setColor(0x8b8df8)
    .setTitle(`📊 Server Analytics & Health — ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .addFields(
      {
        name: '👥 Members Breakdown',
        value: `• **Total Members:** ${totalMembers}\n• **Humans:** ${humans}\n• **Bots:** ${bots}`,
        inline: true
      },
      {
        name: '📁 Channels & Structure',
        value: `• **Text Channels:** ${textChannels}\n• **Voice Channels:** ${voiceChannels}\n• **Categories:** ${categories}`,
        inline: true
      },
      {
        name: '🛡️ Governance & Roles',
        value: `• **Total Roles:** ${totalRoles}\n• **Owner ID:** \`${guild.ownerId}\``,
        inline: true
      },
      {
        name: '💾 Backup System Analytics',
        value: `• **Saved Backups:** ${backupStats.totalBackups} snapshots\n• **Latest Snapshot Size:** ${backupStats.latestSizeKb} KB\n• **Oldest Record:** ${backupStats.oldestBackup}`,
        inline: false
      }
    )
    .setFooter({ text: 'Curio.Byte Administrative Analytics' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { analyticsCommand, handleAnalyticsCommand };
