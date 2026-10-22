const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/curio.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema tables
db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'default',
    notifications BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT,
    chat_channel_id TEXT,
    audit_enabled BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bot_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    user_id TEXT NOT NULL,
    guild_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS polls (
    poll_id TEXT PRIMARY KEY,
    guild_id TEXT,
    channel_id TEXT,
    message_id TEXT,
    question TEXT NOT NULL,
    option1 TEXT NOT NULL,
    option2 TEXT NOT NULL,
    created_by TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    poll_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    choice INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES polls (poll_id) ON DELETE CASCADE
  );
`);

const statements = {
  // Command analytics
  logCommand: db.prepare('INSERT INTO bot_analytics (command, user_id, guild_id) VALUES (?, ?, ?)'),
  getCommandStats: db.prepare('SELECT command, COUNT(*) as count FROM bot_analytics GROUP BY command ORDER BY count DESC'),
  getGuildCommandStats: db.prepare('SELECT command, COUNT(*) as count FROM bot_analytics WHERE guild_id = ? GROUP BY command ORDER BY count DESC'),
  getTotalCommandsCount: db.prepare('SELECT COUNT(*) as total FROM bot_analytics WHERE guild_id = ?'),

  // User settings
  getUserSettings: db.prepare('SELECT * FROM user_settings WHERE user_id = ?'),
  setUserSetting: db.prepare(`
    INSERT INTO user_settings (user_id, theme, notifications, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      theme = excluded.theme,
      notifications = excluded.notifications,
      updated_at = CURRENT_TIMESTAMP
  `),

  // Guild settings
  getGuildSettings: db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?'),
  setGuildSettings: db.prepare(`
    INSERT INTO guild_settings (guild_id, log_channel_id, chat_channel_id, audit_enabled, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET
      log_channel_id = COALESCE(excluded.log_channel_id, guild_settings.log_channel_id),
      chat_channel_id = COALESCE(excluded.chat_channel_id, guild_settings.chat_channel_id),
      audit_enabled = COALESCE(excluded.audit_enabled, guild_settings.audit_enabled),
      updated_at = CURRENT_TIMESTAMP
  `),

  // Polls
  createPoll: db.prepare(`
    INSERT INTO polls (poll_id, guild_id, channel_id, message_id, question, option1, option2, created_by, is_closed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `),
  getPoll: db.prepare('SELECT * FROM polls WHERE poll_id = ?'),
  updatePollMessageId: db.prepare('UPDATE polls SET message_id = ? WHERE poll_id = ?'),
  closePoll: db.prepare('UPDATE polls SET is_closed = 1 WHERE poll_id = ?'),

  // Poll votes
  recordVote: db.prepare(`
    INSERT INTO poll_votes (poll_id, user_id, choice, timestamp)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(poll_id, user_id) DO UPDATE SET
      choice = excluded.choice,
      timestamp = CURRENT_TIMESTAMP
  `),
  hasVoted: db.prepare('SELECT choice FROM poll_votes WHERE poll_id = ? AND user_id = ?'),
  getPollVotes: db.prepare(`
    SELECT
      SUM(CASE WHEN choice = 1 THEN 1 ELSE 0 END) as votesOpt1,
      SUM(CASE WHEN choice = 2 THEN 1 ELSE 0 END) as votesOpt2,
      COUNT(*) as totalVotes
    FROM poll_votes
    WHERE poll_id = ?
  `)
};

module.exports = {
  db,
  // Analytics
  logCommand: (command, userId, guildId = null) => statements.logCommand.run(command, userId, guildId),
  getCommandStats: () => statements.getCommandStats.all(),
  getGuildCommandStats: (guildId) => statements.getGuildCommandStats.all(guildId),
  getTotalCommandsCount: (guildId) => statements.getTotalCommandsCount.get(guildId)?.total || 0,

  // User Settings
  getUserSettings: (userId) => statements.getUserSettings.get(userId),
  setUserSetting: (userId, theme, notifications) => statements.setUserSetting.run(userId, theme, notifications ? 1 : 0),

  // Guild Settings
  getGuildSettings: (guildId) => statements.getGuildSettings.get(guildId),
  setGuildSettings: (guildId, logChannelId, chatChannelId, auditEnabled = 1) =>
    statements.setGuildSettings.run(guildId, logChannelId, chatChannelId, auditEnabled ? 1 : 0),

  // Polls
  createPoll: (pollId, guildId, channelId, messageId, question, option1, option2, createdBy) =>
    statements.createPoll.run(pollId, guildId, channelId, messageId, question, option1, option2, createdBy),
  getPoll: (pollId) => statements.getPoll.get(pollId),
  updatePollMessageId: (pollId, messageId) => statements.updatePollMessageId.run(messageId, pollId),
  closePoll: (pollId) => statements.closePoll.run(pollId),

  // Votes
  recordVote: (pollId, userId, choice) => statements.recordVote.run(pollId, userId, choice),
  hasVoted: (pollId, userId) => statements.hasVoted.get(pollId, userId),
  getPollVotes: (pollId) => {
    const res = statements.getPollVotes.get(pollId);
    return {
      votesOpt1: Number(res?.votesOpt1 || 0),
      votesOpt2: Number(res?.votesOpt2 || 0),
      totalVotes: Number(res?.totalVotes || 0)
    };
  }
};
