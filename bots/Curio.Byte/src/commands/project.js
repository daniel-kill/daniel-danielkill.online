const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const PROJECTS = [
  {
    name: 'PowerShell System Health',
    key: 'powershell',
    description: 'System health checks, process auditing, and automated maintenance scripts for Windows/WSL environments.',
    tags: ['powershell', 'automation', 'sysadmin'],
    url: 'https://github.com/daniel-kill/daniel-danielkill.online'
  },
  {
    name: 'Node.js Log Analyzer',
    key: 'log-analyzer',
    description: 'Parse, summarize, and extract structured metrics or errors from large application logs.',
    tags: ['nodejs', 'javascript', 'logs', 'parser'],
    url: 'https://github.com/daniel-kill/daniel-danielkill.online'
  },
  {
    name: 'Shell Safe Backup',
    key: 'shell-backup',
    description: 'A robust Bash utility for scheduled, non-destructive backups with atomic replacements.',
    tags: ['bash', 'shell', 'backup', 'automation'],
    url: 'https://github.com/daniel-kill/daniel-danielkill.online'
  },
  {
    name: 'C# File Organizer',
    key: 'file-organizer',
    description: 'A .NET utility application for sorting and organizing files based on metadata and strict rules.',
    tags: ['csharp', 'dotnet', 'utility', 'files'],
    url: 'https://github.com/daniel-kill/daniel-danielkill.online'
  }
];

const projectCommand = new SlashCommandBuilder()
  .setName('project')
  .setDescription('Search or view portfolio programming projects')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Keyword or language to search for (e.g. powershell, node, backup)')
      .setRequired(false));

async function handleProjectCommand(interaction) {
  const query = interaction.options.getString('query')?.toLowerCase().trim();

  if (!query) {
    const listEmbed = new EmbedBuilder()
      .setColor(0x72e0c1)
      .setTitle('📦 Portfolio Projects Showcase')
      .setDescription('Here are the featured projects from **Code, Build, Repeat**:\n')
      .addFields(
        PROJECTS.map(p => ({
          name: p.name,
          value: `${p.description}\n[View Repository](${p.url})`,
          inline: false
        }))
      )
      .setFooter({ text: 'Use /project query:<keyword> to filter specific topics.' });

    await interaction.reply({ embeds: [listEmbed] });
    return;
  }

  const results = PROJECTS.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query) ||
    p.tags.some(tag => tag.includes(query))
  );

  if (results.length === 0) {
    await interaction.reply({
      content: `🔍 No projects matched your search for **"${query}"**. Try searching for terms like \`powershell\`, \`logs\`, \`backup\`, or \`csharp\`.`,
      ephemeral: true
    });
    return;
  }

  const searchEmbed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🔍 Search Results for "${query}"`)
    .setDescription(`Found ${results.length} matching project(s):\n`)
    .addFields(
      results.map(p => ({
        name: p.name,
        value: `${p.description}\n[View Repository](${p.url})`,
        inline: false
      }))
    );

  await interaction.reply({ embeds: [searchEmbed] });
}

module.exports = { projectCommand, handleProjectCommand };
