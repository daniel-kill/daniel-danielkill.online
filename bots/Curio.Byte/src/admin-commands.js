const fs = require("node:fs");
const path = require("node:path");
const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");

const privateDir = path.join(__dirname, "..", ".private");
const warningsPath = path.join(privateDir, "warnings.jsonl");
const channelLocksPath = path.join(privateDir, "channel-locks.json");

const adminCommands = [
  new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("Moderate server members and messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command
      .setName("ban")
      .setDescription("Ban a member from this server.")
      .addUserOption(option => option.setName("user").setDescription("Member to ban.").setRequired(true))
      .addStringOption(option => option.setName("reason").setDescription("Reason for the ban.").setMaxLength(500)))
    .addSubcommand(command => command
      .setName("kick")
      .setDescription("Remove a member from this server.")
      .addUserOption(option => option.setName("user").setDescription("Member to kick.").setRequired(true))
      .addStringOption(option => option.setName("reason").setDescription("Reason for the kick.").setMaxLength(500)))
    .addSubcommand(command => command
      .setName("timeout")
      .setDescription("Timeout a member for a number of minutes.")
      .addUserOption(option => option.setName("user").setDescription("Member to timeout.").setRequired(true))
      .addIntegerOption(option => option.setName("minutes").setDescription("Timeout duration in minutes (1–40320).").setMinValue(1).setMaxValue(40320).setRequired(true))
      .addStringOption(option => option.setName("reason").setDescription("Reason for the timeout.").setMaxLength(500)))
    .addSubcommand(command => command
      .setName("warn")
      .setDescription("Record a warning and notify a member.")
      .addUserOption(option => option.setName("user").setDescription("Member to warn.").setRequired(true))
      .addStringOption(option => option.setName("reason").setDescription("Reason for the warning.").setMaxLength(500).setRequired(true)))
    .addSubcommand(command => command
      .setName("warnings")
      .setDescription("Show the latest recorded warnings for a member.")
      .addUserOption(option => option.setName("user").setDescription("Member whose warnings to show.")))
    .addSubcommand(command => command
      .setName("clear-warnings")
      .setDescription("Delete all recorded warnings for a member.")
      .addUserOption(option => option.setName("user").setDescription("Member whose warnings to clear.").setRequired(true))
      .addBooleanOption(option => option.setName("confirm").setDescription("Confirm permanent deletion of these warning records.").setRequired(true)))
    .addSubcommand(command => command
      .setName("purge")
      .setDescription("Bulk-delete up to 100 recent messages in this channel.")
      .addIntegerOption(option => option.setName("count").setDescription("Number of recent messages to delete (1–100).").setMinValue(1).setMaxValue(100).setRequired(true))),
  new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Create and manage server channels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command
      .setName("create")
      .setDescription("Create a text, voice, or category channel.")
      .addStringOption(option => option.setName("name").setDescription("New channel name.").setMaxLength(100).setRequired(true))
      .addStringOption(option => option
        .setName("type")
        .setDescription("Channel type.")
        .setRequired(true)
        .addChoices(
          { name: "Text", value: "text" },
          { name: "Voice", value: "voice" },
          { name: "Category", value: "category" }
        ))
      .addChannelOption(option => option
        .setName("category")
        .setDescription("Parent category for the new channel.")
        .addChannelTypes(ChannelType.GuildCategory))
      .addStringOption(option => option.setName("topic").setDescription("Topic for a text channel.").setMaxLength(1024)))
    .addSubcommand(command => command
      .setName("edit")
      .setDescription("Edit a channel's name or type-specific settings.")
      .addChannelOption(option => option.setName("channel").setDescription("Channel to edit.").setRequired(true))
      .addStringOption(option => option.setName("name").setDescription("New channel name.").setMaxLength(100))
      .addStringOption(option => option.setName("topic").setDescription("New text-channel topic.").setMaxLength(1024))
      .addBooleanOption(option => option.setName("nsfw").setDescription("Whether the text channel is age-restricted."))
      .addIntegerOption(option => option.setName("slowmode").setDescription("Text slowmode in seconds (0–21600).").setMinValue(0).setMaxValue(21600))
      .addIntegerOption(option => option.setName("user-limit").setDescription("Voice user limit (0 means unlimited; maximum 99).").setMinValue(0).setMaxValue(99))
      .addIntegerOption(option => option.setName("bitrate").setDescription("Voice bitrate in bits per second.")))
    .addSubcommand(command => command
      .setName("delete")
      .setDescription("Permanently delete a channel.")
      .addChannelOption(option => option.setName("channel").setDescription("Channel to delete.").setRequired(true))
      .addBooleanOption(option => option.setName("confirm").setDescription("Confirm permanent channel deletion.").setRequired(true)))
    .addSubcommand(command => command
      .setName("lock")
      .setDescription("Prevent @everyone from sending messages or connecting.")
      .addChannelOption(option => option.setName("channel").setDescription("Text or voice channel to lock.").setRequired(true)))
    .addSubcommand(command => command
      .setName("unlock")
      .setDescription("Restore @everyone channel permissions saved by /channel lock.")
      .addChannelOption(option => option.setName("channel").setDescription("Channel to unlock.").setRequired(true))),
  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Create and manage server roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command
      .setName("create")
      .setDescription("Create a role.")
      .addStringOption(option => option.setName("name").setDescription("New role name.").setMaxLength(100).setRequired(true))
      .addStringOption(option => option.setName("color").setDescription("Hex color such as #5865F2."))
      .addBooleanOption(option => option.setName("hoist").setDescription("Display members with this role separately."))
      .addBooleanOption(option => option.setName("mentionable").setDescription("Allow members to mention this role.")))
    .addSubcommand(command => command
      .setName("edit")
      .setDescription("Edit a role's name, color, or display settings.")
      .addRoleOption(option => option.setName("role").setDescription("Role to edit.").setRequired(true))
      .addStringOption(option => option.setName("name").setDescription("New role name.").setMaxLength(100))
      .addStringOption(option => option.setName("color").setDescription("Hex color such as #5865F2."))
      .addBooleanOption(option => option.setName("hoist").setDescription("Display members with this role separately."))
      .addBooleanOption(option => option.setName("mentionable").setDescription("Allow members to mention this role.")))
    .addSubcommand(command => command
      .setName("delete")
      .setDescription("Permanently delete a role.")
      .addRoleOption(option => option.setName("role").setDescription("Role to delete.").setRequired(true))
      .addBooleanOption(option => option.setName("confirm").setDescription("Confirm permanent role deletion.").setRequired(true)))
    .addSubcommand(command => command
      .setName("add")
      .setDescription("Give a role to a member.")
      .addUserOption(option => option.setName("user").setDescription("Member to update.").setRequired(true))
      .addRoleOption(option => option.setName("role").setDescription("Role to assign.").setRequired(true)))
    .addSubcommand(command => command
      .setName("remove")
      .setDescription("Remove a role from a member.")
      .addUserOption(option => option.setName("user").setDescription("Member to update.").setRequired(true))
      .addRoleOption(option => option.setName("role").setDescription("Role to remove.").setRequired(true)))
    .addSubcommand(command => command
      .setName("permission")
      .setDescription("Grant or revoke one Discord permission on a role.")
      .addRoleOption(option => option.setName("role").setDescription("Role whose permissions to edit.").setRequired(true))
      .addStringOption(option => option.setName("permission").setDescription("Exact permission name, for example ManageChannels or Administrator.").setMaxLength(40).setRequired(true))
      .addStringOption(option => option
        .setName("action")
        .setDescription("Whether to grant or revoke the permission.")
        .setRequired(true)
        .addChoices(
          { name: "Grant", value: "grant" },
          { name: "Revoke", value: "revoke" }
        ))),
  new SlashCommandBuilder()
    .setName("server")
    .setDescription("View server administration information.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command
      .setName("info")
      .setDescription("Show basic information about this server."))
];

function readWarnings() {
  if (!fs.existsSync(warningsPath)) return [];

  return fs.readFileSync(warningsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      let warning;
      try {
        warning = JSON.parse(line);
      } catch (error) {
        throw new Error(`Could not parse warning record on line ${index + 1}: ${error.message}`);
      }
      if (!warning.guildId || !warning.userId || !warning.reason || !warning.createdAt) {
        throw new Error(`Warning record on line ${index + 1} is missing required fields.`);
      }
      return warning;
    });
}

function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(temporaryPath, 0o600);
  fs.renameSync(temporaryPath, filePath);
}

function writeWarningsAtomically(warnings) {
  const temporaryPath = `${warningsPath}.${process.pid}.tmp`;
  const content = warnings.map(warning => JSON.stringify(warning)).join("\n");
  fs.writeFileSync(temporaryPath, content ? `${content}\n` : "", { mode: 0o600 });
  fs.chmodSync(temporaryPath, 0o600);
  fs.renameSync(temporaryPath, warningsPath);
}

function readChannelLocks() {
  if (!fs.existsSync(channelLocksPath)) return {};
  const locks = JSON.parse(fs.readFileSync(channelLocksPath, "utf8"));
  if (!locks || Array.isArray(locks) || typeof locks !== "object") {
    throw new Error("The saved channel lock file has an invalid format.");
  }
  return locks;
}

function confirmRequired(interaction, description) {
  if (!interaction.options.getBoolean("confirm", true)) {
    throw new Error(`${description} was not confirmed; no changes were made.`);
  }
}

function validateColor(color) {
  if (!/^#?[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Color must be a six-digit hexadecimal value, for example #5865F2.");
  }
  return color.startsWith("#") ? color : `#${color}`;
}

async function getMember(interaction) {
  const user = interaction.options.getUser("user", true);
  return interaction.guild.members.fetch(user.id);
}

async function getChannel(interaction) {
  const selectedChannel = interaction.options.getChannel("channel", true);
  const channel = await interaction.guild.channels.fetch(selectedChannel.id);
  if (!channel) throw new Error("That channel is no longer available in this server.");
  return channel;
}

async function getRole(interaction) {
  const selectedRole = interaction.options.getRole("role", true);
  const role = await interaction.guild.roles.fetch(selectedRole.id);
  if (!role) throw new Error("That role is no longer available in this server.");
  return role;
}

function isTextChannel(channel) {
  return [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement
  ].includes(channel.type);
}

function lockPermissionNames(channel) {
  if (isTextChannel(channel)) return ["SendMessages", "SendMessagesInThreads"];
  if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) return ["Connect"];
  throw new Error("Only text, announcement, voice, and stage channels can be locked.");
}

function snapshotOverwrite(overwrite, permissionNames) {
  return Object.fromEntries(permissionNames.map(name => {
    const permission = PermissionFlagsBits[name];
    const state = overwrite?.allow.has(permission) ? "allow" : overwrite?.deny.has(permission) ? "deny" : "inherit";
    return [name, state];
  }));
}

async function handleModeration(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "ban" || subcommand === "kick" || subcommand === "timeout") {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason") || `Action by ${interaction.user.tag}`;
    if (member.id === interaction.user.id) throw new Error("You cannot apply this action to yourself.");
    if (member.id === interaction.client.user.id) throw new Error("You cannot apply this action to the bot.");

    if (subcommand === "ban") {
      await member.ban({ reason });
      await interaction.editReply(`Banned ${member.user.tag}.`);
    } else if (subcommand === "kick") {
      await member.kick(reason);
      await interaction.editReply(`Kicked ${member.user.tag}.`);
    } else {
      const minutes = interaction.options.getInteger("minutes", true);
      await member.timeout(minutes * 60_000, reason);
      await interaction.editReply(`Timed out ${member.user.tag} for ${minutes} minute(s).`);
    }
    return;
  }

  if (subcommand === "warn") {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason", true);
    const warning = {
      guildId: interaction.guildId,
      userId: member.id,
      userTag: member.user.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      createdAt: new Date().toISOString()
    };
    fs.appendFileSync(warningsPath, `${JSON.stringify(warning)}\n`, { mode: 0o600 });
    fs.chmodSync(warningsPath, 0o600);
    let notified = true;
    try {
      await member.send(`You have received a warning in **${interaction.guild.name}**: ${reason}`);
    } catch (error) {
      notified = false;
      console.warn(`Could not DM warning notice to ${member.user.tag}: ${error.message}`);
    }
    await interaction.editReply(`Recorded a warning for ${member.user.tag}.${notified ? " They were notified by DM." : " Their DMs could not be delivered."}`);
    return;
  }

  if (subcommand === "warnings" || subcommand === "clear-warnings") {
    const user = interaction.options.getUser("user");
    if (subcommand === "clear-warnings") confirmRequired(interaction, "Clearing warnings");
    const warnings = readWarnings();
    const matches = warnings.filter(warning =>
      warning.guildId === interaction.guildId && (!user || warning.userId === user.id)
    );
    if (subcommand === "clear-warnings") {
      const remaining = warnings.filter(warning =>
        warning.guildId !== interaction.guildId || warning.userId !== user.id
      );
      writeWarningsAtomically(remaining);
      await interaction.editReply(`Cleared ${matches.length} warning(s) for ${user.tag}.`);
      return;
    }
    const latest = matches.slice(-10).reverse();
    if (latest.length === 0) {
      await interaction.editReply(user ? `No warnings are recorded for ${user.tag}.` : "No warnings are recorded for this server.");
      return;
    }
    const lines = latest.map(warning =>
      `• ${warning.createdAt.slice(0, 10)} — ${warning.userTag}: ${warning.reason.slice(0, 300)}`
    );
    await interaction.editReply(`Latest warning records${user ? ` for ${user.tag}` : ""}:\n${lines.join("\n")}`.slice(0, 1900));
    return;
  }

  const count = interaction.options.getInteger("count", true);
  if (!interaction.channel || typeof interaction.channel.bulkDelete !== "function") {
    throw new Error("This channel does not support bulk deletion.");
  }
  const deleted = await interaction.channel.bulkDelete(count, true);
  await interaction.editReply(`Deleted ${deleted.size} recent message(s). Messages older than 14 days are skipped by Discord.`);
}

async function handleChannel(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "create") {
    const name = interaction.options.getString("name", true);
    const type = interaction.options.getString("type", true);
    const category = interaction.options.getChannel("category");
    const topic = interaction.options.getString("topic");
    if (category && type === "category") throw new Error("A category cannot be created inside another category.");
    if (topic && type !== "text") throw new Error("A topic can only be set when creating a text channel.");
    const options = {
      name,
      type: type === "text" ? ChannelType.GuildText : type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildCategory
    };
    if (category) options.parent = category.id;
    if (topic && type === "text") options.topic = topic;
    const channel = await interaction.guild.channels.create(options);
    await interaction.editReply(`Created ${channel}.`);
    return;
  }

  const channel = await getChannel(interaction);
  if (subcommand === "edit") {
    const changes = {};
    const name = interaction.options.getString("name");
    const topic = interaction.options.getString("topic");
    const nsfw = interaction.options.getBoolean("nsfw");
    const slowmode = interaction.options.getInteger("slowmode");
    const userLimit = interaction.options.getInteger("user-limit");
    const bitrate = interaction.options.getInteger("bitrate");

    if (name !== null) changes.name = name;
    if (topic !== null) {
      if (!isTextChannel(channel)) throw new Error("Topic can only be changed on a text or announcement channel.");
      changes.topic = topic;
    }
    if (nsfw !== null) {
      if (!isTextChannel(channel)) throw new Error("Age restriction can only be changed on a text or announcement channel.");
      changes.nsfw = nsfw;
    }
    if (slowmode !== null) {
      if (!isTextChannel(channel)) throw new Error("Slowmode can only be changed on a text or announcement channel.");
      changes.rateLimitPerUser = slowmode;
    }
    if (userLimit !== null) {
      if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
        throw new Error("User limit can only be changed on a voice or stage channel.");
      }
      changes.userLimit = userLimit;
    }
    if (bitrate !== null) {
      if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
        throw new Error("Bitrate can only be changed on a voice or stage channel.");
      }
      if (bitrate < 8_000 || bitrate > 384_000) throw new Error("Bitrate must be between 8000 and 384000 bits per second.");
      changes.bitrate = bitrate;
    }
    if (Object.keys(changes).length === 0) throw new Error("Provide at least one setting to change.");
    await channel.edit(changes);
    await interaction.editReply(`Updated ${channel}.`);
    return;
  }

  if (subcommand === "delete") {
    confirmRequired(interaction, "Channel deletion");
    const name = channel.name;
    await channel.delete(`Deleted by ${interaction.user.tag}`);
    await interaction.editReply(`Deleted #${name}.`);
    return;
  }

  if (subcommand === "lock") {
    const permissionNames = lockPermissionNames(channel);
    const locks = readChannelLocks();
    const key = `${interaction.guildId}:${channel.id}`;
    if (locks[key]) throw new Error("This channel is already locked by the bot.");
    const everyone = interaction.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
    const previous = snapshotOverwrite(overwrite, permissionNames);
    locks[key] = { guildId: interaction.guildId, channelId: channel.id, permissions: previous };
    writeJsonAtomically(channelLocksPath, locks);
    try {
      await channel.permissionOverwrites.edit(
        everyone,
        Object.fromEntries(permissionNames.map(name => [name, false])),
        { reason: `Locked by ${interaction.user.tag}` }
      );
    } catch (error) {
      delete locks[key];
      writeJsonAtomically(channelLocksPath, locks);
      throw error;
    }
    await interaction.editReply(`Locked ${channel}.`);
    return;
  }

  const locks = readChannelLocks();
  const key = `${interaction.guildId}:${channel.id}`;
  const savedLock = locks[key];
  if (!savedLock) throw new Error("There is no saved lock for this channel; no permissions were changed.");
  if (!savedLock.permissions || typeof savedLock.permissions !== "object") {
    throw new Error("The saved lock for this channel is invalid; no permissions were changed.");
  }
  const restore = Object.fromEntries(Object.entries(savedLock.permissions).map(([name, state]) => [
    name,
    state === "allow" ? true : state === "deny" ? false : null
  ]));
  await channel.permissionOverwrites.edit(
    interaction.guild.roles.everyone,
    restore,
    { reason: `Unlocked by ${interaction.user.tag}` }
  );
  delete locks[key];
  writeJsonAtomically(channelLocksPath, locks);
  await interaction.editReply(`Restored the saved @everyone permissions for ${channel}.`);
}

async function handleRole(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "create") {
    const name = interaction.options.getString("name", true);
    const color = interaction.options.getString("color");
    const hoist = interaction.options.getBoolean("hoist");
    const mentionable = interaction.options.getBoolean("mentionable");
    const options = { name };
    if (color !== null) options.color = validateColor(color);
    if (hoist !== null) options.hoist = hoist;
    if (mentionable !== null) options.mentionable = mentionable;
    const role = await interaction.guild.roles.create(options);
    await interaction.editReply(`Created role **${role.name}**.`);
    return;
  }

  if (subcommand === "edit") {
    const role = await getRole(interaction);
    const changes = {};
    const name = interaction.options.getString("name");
    const color = interaction.options.getString("color");
    const hoist = interaction.options.getBoolean("hoist");
    const mentionable = interaction.options.getBoolean("mentionable");
    if (name !== null) changes.name = name;
    if (color !== null) changes.color = validateColor(color);
    if (hoist !== null) changes.hoist = hoist;
    if (mentionable !== null) changes.mentionable = mentionable;
    if (Object.keys(changes).length === 0) throw new Error("Provide at least one setting to change.");
    await role.edit(changes);
    await interaction.editReply(`Updated role **${role.name}**.`);
    return;
  }

  if (subcommand === "delete") {
    confirmRequired(interaction, "Role deletion");
    const role = await getRole(interaction);
    const name = role.name;
    await role.delete(`Deleted by ${interaction.user.tag}`);
    await interaction.editReply(`Deleted role **${name}**.`);
    return;
  }

  if (subcommand === "permission") {
    const role = await getRole(interaction);
    if (role.managed) throw new Error("Managed integration roles cannot be edited manually.");
    const permissionName = interaction.options.getString("permission", true);
    if (!Object.hasOwn(PermissionFlagsBits, permissionName)) {
      throw new Error(`Unknown permission "${permissionName}". Use a name from discord.js PermissionFlagsBits, such as ManageChannels or Administrator.`);
    }
    const permission = PermissionFlagsBits[permissionName];
    const action = interaction.options.getString("action", true);
    const permissions = action === "grant"
      ? role.permissions.add(permission)
      : role.permissions.remove(permission);
    await role.setPermissions(permissions, `${action === "grant" ? "Granted" : "Revoked"} ${permissionName} by ${interaction.user.tag}`);
    await interaction.editReply(`${action === "grant" ? "Granted" : "Revoked"} **${permissionName}** ${action === "grant" ? "on" : "from"} role **${role.name}**.`);
    return;
  }

  const member = await getMember(interaction);
  const role = await getRole(interaction);
  if (role.managed) throw new Error("Managed integration roles cannot be assigned or removed manually.");
  if (subcommand === "add") {
    await member.roles.add(role, `Assigned by ${interaction.user.tag}`);
    await interaction.editReply(`Assigned **${role.name}** to ${member.user.tag}.`);
  } else {
    await member.roles.remove(role, `Removed by ${interaction.user.tag}`);
    await interaction.editReply(`Removed **${role.name}** from ${member.user.tag}.`);
  }
}

async function handleServer(interaction) {
  const guild = interaction.guild;
  await interaction.editReply([
    `**${guild.name}**`,
    `ID: ${guild.id}`,
    `Owner ID: ${guild.ownerId}`,
    `Members: ${guild.memberCount ?? "unknown"}`,
    `Created: ${guild.createdAt.toISOString()}`
  ].join("\n"));
}

async function handleAdminCommand(interaction) {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.editReply("These commands can only be used inside a server.");
    return;
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.editReply("You need the Administrator permission to use this command.");
    return;
  }

  try {
    switch (interaction.commandName) {
      case "moderation":
        await handleModeration(interaction);
        break;
      case "channel":
        await handleChannel(interaction);
        break;
      case "role":
        await handleRole(interaction);
        break;
      case "server":
        await handleServer(interaction);
        break;
      default:
        throw new Error(`Unsupported administration command: ${interaction.commandName}`);
    }
  } catch (error) {
    console.error(`Administration command /${interaction.commandName} failed:`, error);
    await interaction.editReply(`Could not complete the command: ${error.message}`.slice(0, 1900));
  }
}

module.exports = { adminCommands, handleAdminCommand };
