const fs = require("node:fs/promises");
const path = require("node:path");

const BACKUP_ROOT = path.join(__dirname, "..", "server-backups");
const INTERVAL_MS = 4 * 60 * 60 * 1000;

function toJson(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

async function safe(label, fn, errors) {
  try {
    return await fn();
  } catch (error) {
    errors.push({ section: label, error: error.message });
    return null;
  }
}

function overwrites(channel) {
  return [...(channel.permissionOverwrites?.cache.values() ?? [])].map(o => ({
    id: o.id,
    type: o.type,
    allow: o.allow.bitfield.toString(),
    deny: o.deny.bitfield.toString()
  }));
}

function serializeChannel(c) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    parentId: c.parentId ?? null,
    position: c.rawPosition ?? null,
    topic: c.topic ?? null,
    nsfw: c.nsfw ?? null,
    rateLimitPerUser: c.rateLimitPerUser ?? null,
    defaultAutoArchiveDuration: c.defaultAutoArchiveDuration ?? null,
    bitrate: c.bitrate ?? null,
    userLimit: c.userLimit ?? null,
    rtcRegion: c.rtcRegion ?? null,
    videoQualityMode: c.videoQualityMode ?? null,
    availableTags: c.availableTags ?? null,
    defaultReactionEmoji: c.defaultReactionEmoji ?? null,
    defaultSortOrder: c.defaultSortOrder ?? null,
    defaultForumLayout: c.defaultForumLayout ?? null,
    permissionOverwrites: overwrites(c)
  };
}

async function collectGuild(guild) {
  const errors = [];
  const data = { backedUpAt: new Date().toISOString(), errors };

  data.guild = {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    ownerId: guild.ownerId,
    icon: guild.iconURL({ size: 4096 }),
    banner: guild.bannerURL({ size: 4096 }),
    splash: guild.splashURL({ size: 4096 }),
    discoverySplash: guild.discoverySplashURL({ size: 4096 }),
    preferredLocale: guild.preferredLocale,
    verificationLevel: guild.verificationLevel,
    explicitContentFilter: guild.explicitContentFilter,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    mfaLevel: guild.mfaLevel,
    nsfwLevel: guild.nsfwLevel,
    afkChannelId: guild.afkChannelId,
    afkTimeout: guild.afkTimeout,
    systemChannelId: guild.systemChannelId,
    systemChannelFlags: guild.systemChannelFlags?.bitfield?.toString() ?? null,
    rulesChannelId: guild.rulesChannelId,
    publicUpdatesChannelId: guild.publicUpdatesChannelId,
    safetyAlertsChannelId: guild.safetyAlertsChannelId ?? null,
    vanityURLCode: guild.vanityURLCode,
    premiumTier: guild.premiumTier,
    premiumProgressBarEnabled: guild.premiumProgressBarEnabled,
    features: guild.features,
    createdAt: guild.createdAt.toISOString()
  };

  const channels = await safe("channels", () => guild.channels.fetch(), errors);
  data.channels = channels ? [...channels.values()].filter(Boolean).map(serializeChannel) : [];

  const threads = await safe("threads", () => guild.channels.fetchActiveThreads(), errors);
  data.activeThreads = threads
    ? [...threads.threads.values()].map(t => ({
        id: t.id, name: t.name, type: t.type, parentId: t.parentId,
        archived: t.archived, locked: t.locked, ownerId: t.ownerId
      }))
    : [];

  const roles = await safe("roles", () => guild.roles.fetch(), errors);
  data.roles = roles
    ? [...roles.values()].map(r => ({
        id: r.id, name: r.name, color: r.color, hoist: r.hoist, position: r.position,
        permissions: r.permissions.bitfield.toString(), managed: r.managed,
        mentionable: r.mentionable, icon: r.iconURL?.() ?? null,
        unicodeEmoji: r.unicodeEmoji ?? null, tags: toJson(r.tags) ?? null
      }))
    : [];

  const members = await safe("members", () => guild.members.fetch(), errors);
  data.members = members
    ? [...members.values()].map(m => ({
        id: m.id,
        username: m.user.username,
        globalName: m.user.globalName,
        bot: m.user.bot,
        nickname: m.nickname,
        avatar: m.displayAvatarURL({ size: 1024 }),
        joinedAt: m.joinedAt?.toISOString() ?? null,
        premiumSince: m.premiumSince?.toISOString() ?? null,
        pending: m.pending,
        communicationDisabledUntil: m.communicationDisabledUntil?.toISOString() ?? null,
        roles: [...m.roles.cache.keys()].filter(id => id !== guild.id)
      }))
    : [];

  const webhooks = await safe("webhooks", () => guild.fetchWebhooks(), errors);
  data.webhooks = webhooks
    ? [...webhooks.values()].map(w => ({
        id: w.id, name: w.name, type: w.type, channelId: w.channelId,
        avatar: w.avatarURL(), ownerId: w.owner?.id ?? null,
        token: w.token ?? null, url: w.url
      }))
    : [];

  const emojis = await safe("emojis", () => guild.emojis.fetch(), errors);
  data.emojis = emojis
    ? [...emojis.values()].map(e => ({
        id: e.id, name: e.name, animated: e.animated, url: e.imageURL(),
        roles: [...e.roles.cache.keys()]
      }))
    : [];

  const stickers = await safe("stickers", () => guild.stickers.fetch(), errors);
  data.stickers = stickers
    ? [...stickers.values()].map(s => ({
        id: s.id, name: s.name, description: s.description, tags: s.tags,
        format: s.format, url: s.url
      }))
    : [];

  const bans = await safe("bans", () => guild.bans.fetch(), errors);
  data.bans = bans
    ? [...bans.values()].map(b => ({ userId: b.user.id, username: b.user.username, reason: b.reason }))
    : [];

  const invites = await safe("invites", () => guild.invites.fetch(), errors);
  data.invites = invites
    ? [...invites.values()].map(i => ({
        code: i.code, channelId: i.channelId, inviterId: i.inviterId,
        maxUses: i.maxUses, maxAge: i.maxAge, temporary: i.temporary, uses: i.uses
      }))
    : [];

  const automod = await safe("autoModerationRules", () => guild.autoModerationRules.fetch(), errors);
  data.autoModerationRules = automod ? [...automod.values()].map(toJson) : [];

  const events = await safe("scheduledEvents", () => guild.scheduledEvents.fetch(), errors);
  data.scheduledEvents = events
    ? [...events.values()].map(e => ({
        id: e.id, name: e.name, description: e.description, channelId: e.channelId,
        entityType: e.entityType, scheduledStartAt: e.scheduledStartAt?.toISOString() ?? null,
        scheduledEndAt: e.scheduledEndAt?.toISOString() ?? null,
        location: e.entityMetadata?.location ?? null, privacyLevel: e.privacyLevel
      }))
    : [];

  const welcome = await safe("welcomeScreen", () => guild.fetchWelcomeScreen(), errors);
  data.welcomeScreen = welcome ? toJson(welcome) : null;

  const widget = await safe("widgetSettings", () => guild.fetchWidgetSettings(), errors);
  data.widgetSettings = widget ? { enabled: widget.enabled, channelId: widget.channel?.id ?? null } : null;

  const integrations = await safe("integrations", () => guild.fetchIntegrations(), errors);
  data.integrations = integrations
    ? [...integrations.values()].map(i => ({ id: i.id, name: i.name, type: i.type, enabled: i.enabled }))
    : [];

  return data;
}

async function backupGuild(guild) {
  const dir = path.join(BACKUP_ROOT, guild.id);
  await fs.mkdir(dir, { recursive: true });
  const data = await collectGuild(guild);
  const stamp = data.backedUpAt.replace(/[:.]/g, "-");
  const file = path.join(dir, `backup-${stamp}.json`);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await fs.rename(tmp, file);
  await fs.copyFile(file, path.join(dir, "latest.json"));
  return file;
}

async function pruneOld(guildId, keep) {
  const dir = path.join(BACKUP_ROOT, guildId);
  const files = (await fs.readdir(dir)).filter(f => /^backup-.*\.json$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    await fs.rm(path.join(dir, f), { force: true });
  }
}

async function runBackups(client, keep = 60) {
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  for (const guild of client.guilds.cache.values()) {
    try {
      const file = await backupGuild(guild);
      await pruneOld(guild.id, keep);
      console.log(`Server backup saved: ${file}`);
    } catch (error) {
      console.error(`Server backup failed for ${guild.id}:`, error);
    }
  }
}

function startServerBackups(client) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runBackups(client);
    } finally {
      running = false;
    }
  };
  tick();
  return setInterval(tick, INTERVAL_MS);
}

module.exports = { startServerBackups, runBackups, collectGuild, BACKUP_ROOT };
