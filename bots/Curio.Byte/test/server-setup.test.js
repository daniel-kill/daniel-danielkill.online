const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PermissionFlagsBits } = require("discord.js");
const { after, test } = require("node:test");
const { curioCommand, attachAuditLogging } = require("../src/server-setup");

test("registers the administrator-only Curio.Byte setup subcommand", () => {
  const command = curioCommand.toJSON();
  assert.equal(command.name, "curio-byte");
  assert.equal(command.default_member_permissions, PermissionFlagsBits.Administrator.toString());
  assert.deepEqual(command.options.map(option => option.name), ["setup"]);
});

test("registers server event listeners for the requested audit categories", () => {
  const client = new EventEmitter();
  attachAuditLogging(client);
  for (const eventName of [
    "guildMemberAdd",
    "guildMemberRemove",
    "guildMemberUpdate",
    "voiceStateUpdate",
    "channelCreate",
    "channelDelete",
    "channelUpdate",
    "roleCreate",
    "roleDelete",
    "roleUpdate",
    "messageDelete",
    "messageDeleteBulk",
    "messageUpdate",
    "guildBanAdd",
    "guildBanRemove",
    "guildUpdate"
  ]) {
    assert.equal(client.listenerCount(eventName), 1, `expected a listener for ${eventName}`);
  }
});
