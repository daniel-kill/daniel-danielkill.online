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

db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'default',
    notifications BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bot_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    user_id TEXT NOT NULL,
    guild_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const statements = {
  logCommand: db.prepare('INSERT INTO bot_analytics (command, user_id, guild_id) VALUES (?, ?, ?)'),
  getUserSettings: db.prepare('SELECT * FROM user_settings WHERE user_id = ?'),
  setUserSetting: db.prepare(`
    INSERT INTO user_settings (user_id, theme, notifications, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      theme = excluded.theme,
      notifications = excluded.notifications,
      updated_at = CURRENT_TIMESTAMP
  `),
  getCommandStats: db.prepare('SELECT command, COUNT(*) as count FROM bot_analytics GROUP BY command ORDER BY count DESC')
};

module.exports = {
  db,
  logCommand: (command, userId, guildId = null) => statements.logCommand.run(command, userId, guildId),
  getUserSettings: (userId) => statements.getUserSettings.get(userId),
  setUserSetting: (userId, theme, notifications) => statements.setUserSetting.run(userId, theme, notifications ? 1 : 0),
  getCommandStats: () => statements.getCommandStats.all()
};
