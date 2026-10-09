const fs = require("node:fs");
const path = require("node:path");
const { Client, Events, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { handleAdminCommand } = require("./admin-commands");
const { handleAiPromptCommand, handleAiPromptTestCommand } = require("./ai-prompt-command");
const { curioCommand, setupCurioByte, attachAuditLogging } = require("./server-setup");

const configPath = path.join(__dirname, "..", ".private", "config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing .private/config.json. Copy config.example.json to .private/config.json and add your bot token.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (!config.botToken || !config.applicationId) {
  console.error(".private/config.json must include botToken and applicationId.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ]
});
attachAuditLogging(client);
const inviteUrl = config.inviteUrl || `https://discord.com/oauth2/authorize?client_id=${config.applicationId}&scope=bot%20applications.commands`;

client.once(Events.ClientReady, readyClient => {
  console.log(`Curio.Byte is online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (["moderation", "channel", "role", "server", "curio-byte"].includes(interaction.commandName)) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "These commands can only be used inside a server.", ephemeral: true });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: "You need the Administrator permission to use this command.", ephemeral: true });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      if (interaction.commandName === "curio-byte") {
        const { category, channels } = await setupCurioByte(interaction);
        await interaction.editReply([
          "Curio.Byte setup completed. The category and channels are private to server administrators and the bot.",
          `Category: ${category.name}`,
          `Channels: ${channels.logs} and ${channels.chats}`,
          "Server event logging is now enabled. Member join/leave, timeout and voice mute changes, channel/role changes, message edits/deletions, bans, and other supported events will be sent to #logs."
        ].join("\n"));
      } else {
        await handleAdminCommand(interaction);
      }
      return;
    }

    switch (interaction.commandName) {
      case "about": {
        const embed = new EmbedBuilder()
          .setColor(0x8b8df8)
          .setTitle("Curio.Byte")
          .setDescription("The curious companion of **Code, Build, Repeat**.")
          .addFields(
            { name: "Motto", value: "Stay curious. Keep building. Repeat." },
            { name: "What I do", value: "Showcase programming projects, share supported technologies, and help people explore the portfolio." }
          )
          .setFooter({ text: "Forty Years of Curiosity" });
        await interaction.reply({ embeds: [embed] });
        break;
      }
      case "projects": {
        const embed = new EmbedBuilder()
          .setColor(0x72e0c1)
          .setTitle("Projects & Portfolio")
          .setDescription([
            "Explore practical programming projects from Code, Build, Repeat:",
            "",
            "• **PowerShell System Health** — system checks and automation",
            "• **Node.js Log Analyzer** — parse and summarize application logs",
            "• **Shell Safe Backup** — a shell scripting backup utility",
            "• **C# File Organizer** — organize files with a small .NET app",
            "",
            "[View the GitHub repository](https://github.com/daniel-kill/daniel-danielkill.online)"
          ].join("\n"));
        await interaction.reply({ embeds: [embed] });
        break;
      }
      case "languages": {
        await interaction.reply({
          content: "**Tools & languages**\nPowerShell · Node.js / JavaScript · Shell scripting · C#\n\nThe goal: solve practical problems, automate repetitive work, and keep learning."
        });
        break;
      }
      case "invite": {
        await interaction.reply({ content: `Want to add Curio.Byte to a server?\n${inviteUrl}`, ephemeral: true });
        break;
      }
      case "help": {
        await interaction.reply({
          content: [
            "**Curio.Byte commands**",
            "`/ai-prompt ask` — ask an AI assistant a question or get help with a task (private response)",
            "`/ai-prompt test provider:<Groq|Cloudflare Workers AI|Gemini|OpenRouter|Venice>` — test one provider directly (private response)",
            "`/about` — learn about the bot and its mission",
            "`/projects` — see the portfolio project showcase",
            "`/languages` — view the languages and tools featured",
            "`/invite` — get the bot invite link",
            "`/help` — show this command list",
            "`/curio-byte setup` — create private Curio.Byte channels and enable server event logging (server administrators)",
            "`/moderation` — moderate members and messages (server administrators)",
            "`/channel` — create, edit, lock, unlock, and delete channels (server administrators)",
            "`/role` — create, edit, assign, remove, and delete roles (server administrators)",
            "`/server info` — view server information (server administrators)"
          ].join("\n"),
          ephemeral: true
        });
        break;
      }
      case "ai-prompt": {
        const aiHandler = interaction.options.getSubcommand() === "test"
          ? handleAiPromptTestCommand
          : handleAiPromptCommand;
        await aiHandler(interaction, config.veniceApiKey, config.groqApiKey, config.cloudflareAccountId, config.cloudflareApiToken, config.googleAIstudioApiKey, config.openrouterApiKey);
        break;
      }
      default:
        await interaction.reply({ content: "I don't recognize that command. Try `/help`.", ephemeral: true });
    }
  } catch (error) {
    console.error("Interaction error:", error);
    const reply = { content: "The command failed. Check that the bot has the required permissions and that the target or settings are valid.", ephemeral: true };
    if (interaction.deferred) await interaction.editReply(reply);
    else if (interaction.replied) await interaction.followUp(reply);
    else await interaction.reply(reply);
  }
});

client.login(config.botToken).catch(error => {
  console.error("Could not log in. Check botToken in .private/config.json and verify the token in the Discord Developer Portal.");
  console.error(error.message);
  process.exitCode = 1;
});
