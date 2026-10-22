const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// Set in-memory DB path before loading module
const testDbPath = path.join(__dirname, 'test-curio.db');
process.env.DB_PATH = testDbPath;

const db = require('../src/db');

test.beforeEach(() => {
  // Clear tables between tests
  db.db.exec(`
    DELETE FROM poll_votes;
    DELETE FROM polls;
    DELETE FROM bot_analytics;
    DELETE FROM guild_settings;
    DELETE FROM user_settings;
  `);
});

test.after(() => {
  // Cleanup test database file
  try {
    db.db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
});

test('bot_analytics: logs commands and computes totals/top stats', () => {
  db.logCommand('ping', 'user-1', 'guild-100');
  db.logCommand('ping', 'user-2', 'guild-100');
  db.logCommand('echo', 'user-1', 'guild-100');
  db.logCommand('poll', 'user-3', 'guild-200');

  const totalG100 = db.getTotalCommandsCount('guild-100');
  assert.equal(totalG100, 3);

  const statsG100 = db.getGuildCommandStats('guild-100');
  assert.equal(statsG100.length, 2);
  assert.equal(statsG100[0].command, 'ping');
  assert.equal(statsG100[0].count, 2);
  assert.equal(statsG100[1].command, 'echo');
  assert.equal(statsG100[1].count, 1);
});

test('guild_settings: sets and gets configuration', () => {
  db.setGuildSettings('guild-100', 'chan-log-1', 'chan-chat-1', 1);
  let settings = db.getGuildSettings('guild-100');
  assert.equal(settings.log_channel_id, 'chan-log-1');
  assert.equal(settings.chat_channel_id, 'chan-chat-1');
  assert.equal(settings.audit_enabled, 1);

  // Update without overwriting other non-null fields
  db.setGuildSettings('guild-100', 'chan-log-2', null, 0);
  settings = db.getGuildSettings('guild-100');
  assert.equal(settings.log_channel_id, 'chan-log-2');
  assert.equal(settings.chat_channel_id, 'chan-chat-1');
  assert.equal(settings.audit_enabled, 0);
});

test('polls & poll_votes: persists polls and accurately tallies votes', () => {
  const pollId = 'poll-test-uuid-1';
  db.createPoll(pollId, 'guild-1', 'chan-1', 'msg-1', 'Tabs or Spaces?', 'Tabs', 'Spaces', 'user-author');

  const poll = db.getPoll(pollId);
  assert.ok(poll);
  assert.equal(poll.question, 'Tabs or Spaces?');
  assert.equal(poll.is_closed, 0);

  // Initial votes
  let votes = db.getPollVotes(pollId);
  assert.equal(votes.totalVotes, 0);

  // Cast vote for option 1
  db.recordVote(pollId, 'voter-1', 1);
  // Cast vote for option 2
  db.recordVote(pollId, 'voter-2', 2);
  // Cast vote for option 1
  db.recordVote(pollId, 'voter-3', 1);

  votes = db.getPollVotes(pollId);
  assert.equal(votes.totalVotes, 3);
  assert.equal(votes.votesOpt1, 2);
  assert.equal(votes.votesOpt2, 1);

  // Voter 1 switches choice to option 2
  db.recordVote(pollId, 'voter-1', 2);
  votes = db.getPollVotes(pollId);
  assert.equal(votes.totalVotes, 3);
  assert.equal(votes.votesOpt1, 1);
  assert.equal(votes.votesOpt2, 2);

  // Close poll
  db.closePoll(pollId);
  const closedPoll = db.getPoll(pollId);
  assert.equal(closedPoll.is_closed, 1);
});
