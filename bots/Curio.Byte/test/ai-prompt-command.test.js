const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { aiPromptCommand, handleAiPromptCommand, handleAiPromptTestCommand } = require("../src/ai-prompt-command");

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

function createInteraction() {
  return {
    options: { getString(name) { return name === "prompt" ? "test prompt" : null; } },
    deferReply: async () => {},
    editReply: async response => response,
    followUp: async () => {},
    reply: async response => response
  };
}
function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("uses Groq first when all providers are configured", async () => {
  const requests = [];
  global.fetch = async (url, options) => { requests.push({ url, options }); return jsonResponse({ choices: [{ message: { content: "Groq answer" } }] }); };
  const interaction = createInteraction();
  let reply;
  interaction.editReply = async response => { reply = response; };
  await handleAiPromptCommand(interaction, "venice-key", "groq-key", "account-123", "cloudflare-secret", "gemini-key", "openrouter-key");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(requests[0].options.headers.Authorization, "Bearer groq-key");
  assert.equal(reply.content, "**Answered by Groq**\n\nGroq answer");
});

test("falls back from Groq to Cloudflare Workers AI", async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes("api.groq.com")) return jsonResponse({ error: { message: "Groq unavailable" } }, 503);
    return jsonResponse({ choices: [{ message: { content: "Cloudflare answer" } }] });
  };
  const interaction = createInteraction();
  let reply;
  interaction.editReply = async response => { reply = response; };
  await handleAiPromptCommand(interaction, "venice-key", "groq-key", "account-123", "cloudflare-secret", "", "openrouter-key");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, "https://api.cloudflare.com/client/v4/accounts/account-123/ai/v1/chat/completions");
  assert.equal(reply.content, "**Answered by Cloudflare Workers AI**\n\nCloudflare answer");
});

test("uses provider fallback order Groq, Cloudflare, Gemini, OpenRouter, then Venice", async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes("api.groq.com")) return jsonResponse({ error: { message: "Groq unavailable" } }, 503);
    if (url.includes("api.cloudflare.com")) return jsonResponse({ errors: [{ message: "Cloudflare unavailable" }] }, 503);
    if (url.includes("generativelanguage.googleapis.com")) return jsonResponse({ error: { message: "Gemini unavailable" } }, 503);
    if (url.includes("openrouter.ai")) return jsonResponse({ error: { message: "OpenRouter unavailable" } }, 503);
    return jsonResponse({ choices: [{ message: { content: "Venice answer" } }] });
  };
  const interaction = createInteraction();
  let reply;
  interaction.editReply = async response => { reply = response; };
  await handleAiPromptCommand(interaction, "venice-key", "groq-key", "account-123", "cloudflare-secret", "gemini-key", "openrouter-key");
  // Gemini is intentionally tried twice: primary model, then its temporary-load fallback.
  assert.equal(requests.length, 6);
  assert.ok(requests[0].url.includes("api.groq.com"));
  assert.ok(requests[1].url.includes("api.cloudflare.com"));
  assert.ok(requests[2].url.includes("generativelanguage.googleapis.com"));
  assert.ok(requests[3].url.includes("generativelanguage.googleapis.com"));
  assert.ok(requests[4].url.includes("openrouter.ai"));
  assert.ok(requests[5].url.includes("api.venice.ai"));
  assert.equal(JSON.parse(requests[4].options.body).model, "openrouter/free");
  assert.equal(reply.content, "**Answered by Venice**\n\nVenice answer");
});

test("uses a sole configured provider directly", async () => {
  let requestUrl;
  global.fetch = async url => { requestUrl = url; return jsonResponse({ choices: [{ message: { content: "Groq answer" } }] }); };
  const interaction = createInteraction();
  let reply;
  interaction.editReply = async response => { reply = response; };
  await handleAiPromptCommand(interaction, "", "groq-key", "", "", "");
  assert.equal(requestUrl, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(reply.content, "**Answered by Groq**\n\nGroq answer");
});

test("requires at least one configured provider", async () => {
  const interaction = createInteraction();
  let reply;
  interaction.reply = async response => { reply = response; };
  await handleAiPromptCommand(interaction, "", "", "", "", "");
  assert.match(reply.content, /No AI provider is configured/);
  assert.equal(reply.ephemeral, true);
});

test("registers ask and test subcommands with providers in priority order", () => {
  const command = aiPromptCommand.toJSON();
  assert.deepEqual(command.options.map(option => option.name), ["ask", "test"]);
  const testOption = command.options.find(option => option.name === "test");
  assert.deepEqual(testOption.options[0].choices.map(choice => choice.value), ["groq", "cloudflare", "gemini", "openrouter", "venice"]);
});

test("tests Venice directly without trying fallback providers", async () => {
  const requests = [];
  global.fetch = async (url, options) => { requests.push({ url, options }); return jsonResponse({ choices: [{ message: { content: "Curio.Byte provider test passed" } }] }); };
  const interaction = createInteraction();
  interaction.options.getString = name => name === "provider" ? "venice" : null;
  let reply;
  interaction.editReply = async response => { reply = response; };
  await handleAiPromptTestCommand(interaction, "venice-key", "groq-key", "account-123", "cloudflare-secret", "gemini-key", "openrouter-key");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.venice.ai/api/v1/chat/completions");
  assert.equal(requests[0].options.headers.Authorization, "Bearer venice-key");
  assert.match(reply.content, /Venice API test succeeded/);
});

test("does not expose API keys in provider test errors", async () => {
  global.fetch = async () => jsonResponse({ error: { message: "Invalid venice-secret" } }, 401);
  const interaction = createInteraction();
  interaction.options.getString = name => name === "provider" ? "venice" : null;
  let reply;
  interaction.editReply = async response => { reply = response; };
  await handleAiPromptTestCommand(interaction, "venice-secret", "", "", "", "");
  assert.match(reply.content, /Venice API test failed/);
  assert.doesNotMatch(reply.content, /venice-secret/);
});

test("asks to configure Venice before making a test request", async () => {
  let requestCount = 0;
  global.fetch = async () => { requestCount += 1; return jsonResponse({}); };
  const interaction = createInteraction();
  interaction.options.getString = name => name === "provider" ? "venice" : null;
  let reply;
  interaction.reply = async response => { reply = response; };
  await handleAiPromptTestCommand(interaction, "", "groq-key", "", "", "");
  assert.equal(requestCount, 0);
  assert.equal(reply.ephemeral, true);
  assert.match(reply.content, /not fully configured/);
});
