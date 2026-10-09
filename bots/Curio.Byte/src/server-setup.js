const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");

const CATEGORY_NAME = "Curio.Byte";
const CHANNEL_NAMES = ["logs", "chats"];

const curioCommand = new SlashCommandBuilder()
  .setName("curio-byte")
  .setDescription("Set up Curio.Byte's private server channels.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(command => command
    .setName("setup")
    .setDescription("Create the private Curio.Byte category, logs/chats channels, and enable server event logging."));

function clip(value, max = 900) {
  const text = String(value ?? "").replace(/\u0000/g, "").trim();
  if (!text) return "(empty)";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function safeText(value) {
  return clip(value).replace(/@/g, "@\u200b");
}

function getLogChannel(guild) {
  return guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText &&
    channel.name === "logs" &&
    channel.parent?.name === CATEGORY_NAME
  ) || null;
}

async function writeLog(guild, title, description, color = 0x5865f2) {
  try {
    const channel = getLogChannel(guild);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(clip(title, 250))
      .setDescription(clip(description, 3900))
      .setTimestamp(new Date());
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (error) {
    console.warn(`Could not write Curio.Byte audit log for guild ${guild.id}: ${error.message}`);
  }
}

function userLabel(user) {
  return user ? `${safeText(user.tag || user.username || "Unknown user")} (${user.id})` : "Unknown user";
}

function channelLabel(channel) {
  return channel ? `#${safeText(channel.name || "unknown channel")} (${channel.id})` : "Unknown channel";
}

function roleLabel(role) {
  return role ? `@${safeText(role.name)} (${role.id})` : "Unknown role";
}

async function setupCurioByte(interaction) {
  const guild = interaction.guild;
  if (!guild) throw new Error("This command can only be used in a server.");

  const me = guild.members.me || await guild.members.fetch(interaction.client.user.id);
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("Curio.Byte needs the Manage Channels permission to create and secure its category and channels.");
  }

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  let category = guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildCategory && channel.name === CATEGORY_NAME
  );
  if (category) {
    await category.permissionOverwrites.set(overwrites, "Secure Curio.Byte private category");
  } else {
    category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites,
      reason: `Private Curio.Byte setup by ${interaction.user.tag}`
    });
  }

  const channels = {};
  for (const name of CHANNEL_NAMES) {
    let channel = guild.channels.cache.find(existing =>
      existing.type === ChannelType.GuildText &&
      existing.name === name &&
      existing.parentId === category.id
    );
    if (channel) {
      await channel.setParent(category, { lockPermissions: false, reason: "Curio.Byte setup" });
      await channel.permissionOverwrites.set(overwrites, "Secure Curio.Byte private channels");
    } else {
      channel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: overwrites,
        topic: name === "logs"
          ? "Private Curio.Byte server event and moderation log."
          : "Private Curio.Byte chat channel.",
        reason: `Curio.Byte setup by ${interaction.user.tag}`
      });
    }
    channels[name] = channel;
  }

  await writeLog(guild, "Curio.Byte logging enabled", `Setup completed by ${userLabel(interaction.user)}. Server event logging is active.`, 0x57f287);
  return { category, channels };
}

function attachAuditLogging(client) {
  client.on("guildMemberAdd", member => {
    void writeLog(member.guild, "Member joined", `${userLabel(member.user)} joined the server.`, 0x57f287);
  });

  client.on("guildMemberRemove", member => {
    void writeLog(member.guild, "Member left or was removed", `${userLabel(member.user)} left the server or was kicked/banned.`, 0xed4245);
  });

  client.on("guildMemberUpdate", (oldMember, newMember) => {
    const changes = [];
    if (oldMember.nickname !== newMember.nickname) {
      changes.push(`Nickname: ${safeText(oldMember.nickname || oldMember.user.username)} → ${safeText(newMember.nickname || newMember.user.username)}`);
    }
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    for (const role of newRoles.filter(role => !oldRoles.has(role.id)).values()) changes.push(`Role added: ${roleLabel(role)}`);
    for (const role of oldRoles.filter(role => !newRoles.has(role.id)).values()) changes.push(`Role removed: ${roleLabel(role)}`);
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp || null;
    const newTimeout = newMember.communicationDisabledUntilTimestamp || null;
    if (oldTimeout !== newTimeout) {
      changes.push(newTimeout
        ? `Timed out until <t:${Math.floor(newTimeout / 1000)}:F>`
        : "Timeout removed or expired");
    }
    if (changes.length) {
      void writeLog(newMember.guild, "Member updated", `${userLabel(newMember.user)}\n${changes.join("\n")}`, 0xfee75c);
    }
  });

  client.on("voiceStateUpdate", (oldState, newState) => {
    const guild = newState.guild || oldState.guild;
    const user = newState.member?.user || oldState.member?.user;
    if (oldState.serverMute !== newState.serverMute) {
      void writeLog(guild, newState.serverMute ? "Member voice-muted" : "Member voice-unmuted",
        `${userLabel(user)} was ${newState.serverMute ? "server-muted" : "unmuted"} in voice.`, 0xfee75c);
    }
    if (oldState.serverDeaf !== newState.serverDeaf) {
      void writeLog(guild, newState.serverDeaf ? "Member voice-deafened" : "Member voice-undeafened",
        `${userLabel(user)} was ${newState.serverDeaf ? "server-deafened" : "undeafened"} in voice.`, 0xfee75c);
    }
    if (oldState.channelId !== newState.channelId) {
      const movement = !oldState.channelId ? "joined" : !newState.channelId ? "left" : "moved";
      void writeLog(guild, "Voice channel activity", `${userLabel(user)} ${movement} voice: ${oldState.channel?.name || "none"} → ${newState.channel?.name || "none"}.`);
    }
  });

  client.on("channelCreate", channel => {
    if (channel.guild) void writeLog(channel.guild, "Channel created", `${channelLabel(channel)} (type: ${ChannelType[channel.type] || channel.type}).`, 0x57f287);
  });

  client.on("channelDelete", channel => {
    if (channel.guild) void writeLog(channel.guild, "Channel deleted", `${channelLabel(channel)} was deleted.`, 0xed4245);
  });

  client.on("channelUpdate", (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`Name: #${safeText(oldChannel.name)} → #${safeText(newChannel.name)}`);
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push(`Topic: ${safeText(oldChannel.topic)} → ${safeText(newChannel.topic)}`);
    }
    if (changes.length) void writeLog(newChannel.guild, "Channel updated", `${channelLabel(newChannel)}\n${changes.join("\n")}`, 0xfee75c);
  });

  client.on("roleCreate", role => {
    void writeLog(role.guild, "Role created", `${roleLabel(role)}.`, 0x57f287);
  });

  client.on("roleDelete", role => {
    void writeLog(role.guild, "Role deleted", `${roleLabel(role)} was deleted.`, 0xed4245);
  });

  client.on("roleUpdate", (oldRole, newRole) => {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`Name: ${safeText(oldRole.name)} → ${safeText(newRole.name)}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`Displayed separately: ${oldRole.hoist} → ${newRole.hoist}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mentionable: ${oldRole.mentionable} → ${newRole.mentionable}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push("Permissions changed.");
    if (changes.length) void writeLog(newRole.guild, "Role updated", `${roleLabel(newRole)}\n${changes.join("\n")}`, 0xfee75c);
  });

  client.on("messageDelete", message => {
    if (!message.guild) return;
    const details = [
      `Author: ${userLabel(message.author)}`,
      `Channel: ${channelLabel(message.channel)}`,
      `Content: ${safeText(message.content || (message.partial ? "Unavailable (message was not cached)" : "(empty)"))}`
    ];
    void writeLog(message.guild, "Message deleted", details.join("\n"), 0xed4245);
  });

  client.on("messageDeleteBulk", (messages, channel) => {
    if (!channel.guild) return;
    void writeLog(channel.guild, "Messages bulk-deleted", `${messages.size} messages were bulk-deleted in ${channelLabel(channel)}. Individual content may be unavailable.`, 0xed4245);
  });

  client.on("messageUpdate", (oldMessage, newMessage) => {
    if (!newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;
    void writeLog(newMessage.guild, "Message edited", [
      `Author: ${userLabel(newMessage.author || oldMessage.author)}`,
      `Channel: ${channelLabel(newMessage.channel)}`,
      `Before: ${safeText(oldMessage.content || "(unavailable or empty)")}`,
      `After: ${safeText(newMessage.content || "(empty)")}`
    ].join("\n"), 0xfee75c);
  });

  client.on("guildBanAdd", ban => {
    void writeLog(ban.guild, "Member banned", `${userLabel(ban.user)} was banned.`, 0xed4245);
  });

  client.on("guildBanRemove", ban => {
    void writeLog(ban.guild, "Member unbanned", `${userLabel(ban.user)} was unbanned.`, 0x57f287);
  });

  client.on("guildUpdate", (oldGuild, newGuild) => {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push(`Server name: ${safeText(oldGuild.name)} → ${safeText(newGuild.name)}`);
    if (oldGuild.description !== newGuild.description) changes.push("Server description changed.");
    if (changes.length) void writeLog(newGuild, "Server updated", changes.join("\n"), 0xfee75c);
  });

  client.on("emojiCreate", emoji => {
    void writeLog(emoji.guild, "Emoji created", `:${safeText(emoji.name)}: (${emoji.id}).`, 0x57f287);
  });
  client.on("emojiDelete", emoji => {
    void writeLog(emoji.guild, "Emoji deleted", `:${safeText(emoji.name)}: (${emoji.id}) was deleted.`, 0xed4245);
  });
  client.on("emojiUpdate", (oldEmoji, newEmoji) => {
    if (oldEmoji.name !== newEmoji.name) {
      void writeLog(newEmoji.guild, "Emoji renamed", `:${safeText(oldEmoji.name)}: → :${safeText(newEmoji.name)}: (${newEmoji.id}).`, 0xfee75c);
    }
  });
}

module.exports = { curioCommand, setupCurioByte, attachAuditLogging };
