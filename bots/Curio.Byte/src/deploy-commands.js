const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { adminCommands } = require("./admin-commands");
const { aiPromptCommand } = require("./ai-prompt-command");
const { curioCommand } = require("./server-setup");

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

const commands = [
  new SlashCommandBuilder().setName("about").setDescription("Learn about Curio.Byte and its mission."),
  new SlashCommandBuilder().setName("projects").setDescription("Showcase the Code, Build, Repeat programming projects."),
  new SlashCommandBuilder().setName("languages").setDescription("List the programming languages and tools featured."),
  new SlashCommandBuilder().setName("invite").setDescription("Get the link to invite Curio.Byte to a server."),
  new SlashCommandBuilder().setName("help").setDescription("Show Curio.Byte's available commands."),
  curioCommand,
  aiPromptCommand,
  ...adminCommands
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(config.botToken);

(async () => {
  try {
    console.log(`Registering ${commands.length} global slash commands...`);
    await rest.put(Routes.applicationCommands(config.applicationId), { body: commands });
    console.log("Slash commands registered. Global commands can take a little while to appear.");
  } catch (error) {
    console.error("Command registration failed. Verify the token and applicationId in .private/config.json.", error);
    process.exitCode = 1;
  }
})();
