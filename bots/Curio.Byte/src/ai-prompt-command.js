const { SlashCommandBuilder } = require("discord.js");

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_FALLBACK_MODEL = "gemini-3.7-flash";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openrouter/free";
const VENICE_API_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_MODEL = "llama-3.3-70b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";
const CLOUDFLARE_MODEL = "@cf/zai-org/glm-4.7-flash";
const DISCORD_MESSAGE_LIMIT = 1900;

class GeminiApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

const aiPromptCommand = new SlashCommandBuilder()
  .setName("ai-prompt")
  .setDescription("Ask an AI assistant or test a configured provider.")
  .addSubcommand(subcommand => subcommand
    .setName("ask")
    .setDescription("Ask an AI assistant a question or get help with a task.")
    .addStringOption(option => option
      .setName("prompt")
      .setDescription("What would you like help with?")
      .setMaxLength(4000)
      .setRequired(true))
    .addStringOption(option => option
      .setName("context")
      .setDescription("Optional background or details for your request.")
      .setMaxLength(1500)))
  .addSubcommand(subcommand => subcommand
    .setName("test")
    .setDescription("Send a test request to one AI provider.")
    .addStringOption(option => option
      .setName("provider")
      .setDescription("Which configured AI provider should be tested?")
      .setRequired(true)
      .addChoices(
        { name: "Groq", value: "groq" },
        { name: "Cloudflare Workers AI", value: "cloudflare" },
        { name: "Gemini", value: "gemini" },
        { name: "OpenRouter", value: "openrouter" },
        { name: "Venice", value: "venice" }
      )));

function splitResponse(text) {
  const messages = [];
  let remaining = text;

  while (remaining.length > DISCORD_MESSAGE_LIMIT) {
    let splitAt = remaining.lastIndexOf("\n", DISCORD_MESSAGE_LIMIT);
    if (splitAt < DISCORD_MESSAGE_LIMIT / 2) {
      splitAt = remaining.lastIndexOf(" ", DISCORD_MESSAGE_LIMIT);
    }
    if (splitAt < DISCORD_MESSAGE_LIMIT / 2) {
      splitAt = DISCORD_MESSAGE_LIMIT;
    } else {
      splitAt += 1;
    }

    messages.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  if (remaining) messages.push(remaining);
  return messages;
}

function extractOutputText(result) {
  if (!Array.isArray(result.steps)) return "";

  return result.steps
    .filter(step => step.type === "model_output" && Array.isArray(step.content))
    .flatMap(step => step.content)
    .filter(content => content.type === "text" && typeof content.text === "string")
    .map(content => content.text)
    .join("")
    .trim();
}

async function requestGemini(apiKey, input, model) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "Api-Revision": "2026-05-20"
    },
    body: JSON.stringify({
      model,
      input
    }),
    signal: AbortSignal.timeout(45_000)
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new GeminiApiError(response.status, `Gemini API returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!result || typeof result !== "object") {
    throw new GeminiApiError(response.status, `Gemini API returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const detail = typeof result.error?.message === "string"
      ? result.error.message
      : `Gemini API returned HTTP ${response.status}.`;
    throw new GeminiApiError(response.status, detail);
  }

  const output = extractOutputText(result);
  if (!output) {
    throw new Error("Gemini returned no text output.");
  }
  return output;
}

async function requestGeminiWithFallback(apiKey, input) {
  try {
    return await requestGemini(apiKey, input, GEMINI_MODEL);
  } catch (error) {
    if (!(error instanceof GeminiApiError) || ![429, 500, 502, 503, 504].includes(error.status)) {
      throw error;
    }

    console.warn(`Gemini model ${GEMINI_MODEL} returned HTTP ${error.status}; trying ${GEMINI_FALLBACK_MODEL}.`);
    return requestGemini(apiKey, input, GEMINI_FALLBACK_MODEL);
  }
}

async function requestGroq(apiKey, input) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: input }]
    }),
    signal: AbortSignal.timeout(45_000)
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Groq API returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!result || typeof result !== "object") {
    throw new Error(`Groq API returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const detail = typeof result.error?.message === "string"
      ? result.error.message
      : `Groq API returned HTTP ${response.status}.`;
    throw new Error(detail);
  }

  const output = result.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) {
    throw new Error("Groq returned no text output.");
  }
  return output.trim();
}

async function requestOpenRouter(apiKey, input) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: "You are a helpful Discord assistant. Keep replies concise and within Discord message limits." },
        { role: "user", content: input }
      ]
    }),
    signal: AbortSignal.timeout(45_000)
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("OpenRouter API returned invalid JSON (HTTP " + response.status + ")."); }
  if (!result || typeof result !== "object") throw new Error("OpenRouter API returned an invalid response (HTTP " + response.status + ").");
  if (!response.ok) {
    const detail = typeof result.error?.message === "string" ? result.error.message : "OpenRouter API returned HTTP " + response.status + ".";
    throw new Error(detail);
  }
  const output = result.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) throw new Error("OpenRouter returned no text output.");
  return output.trim();
}

async function requestVenice(apiKey, input) {
  const response = await fetch(VENICE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: VENICE_MODEL,
      messages: [
        { role: "system", content: "You are a helpful Discord assistant. Keep replies concise and within Discord message limits." },
        { role: "user", content: input }
      ]
    }),
    signal: AbortSignal.timeout(45000)
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("Venice API returned invalid JSON (HTTP " + response.status + ")."); }
  if (!result || typeof result !== "object") throw new Error("Venice API returned an invalid response (HTTP " + response.status + ").");
  if (!response.ok) {
    const detail = typeof result.error?.message === "string" ? result.error.message : "Venice API returned HTTP " + response.status + ".";
    throw new Error(detail);
  }
  const output = result.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) throw new Error("Venice returned no text output.");
  return output.trim();
}
async function requestCloudflare(accountId, apiToken, input) {
  const normalizedAccountId = typeof accountId === "string" ? accountId.trim() : "";
  const normalizedApiToken = typeof apiToken === "string" ? apiToken.trim() : "";
  if (!normalizedAccountId || !normalizedApiToken) {
    throw new Error("Cloudflare Workers AI requires cloudflareAccountId and cloudflareApiToken.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(normalizedAccountId)}/ai/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${normalizedApiToken}`
      },
      body: JSON.stringify({
        model: CLOUDFLARE_MODEL,
        messages: [{ role: "user", content: input }]
      }),
      signal: AbortSignal.timeout(45_000)
    }
  );

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Cloudflare Workers AI returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!result || typeof result !== "object") {
    throw new Error(`Cloudflare Workers AI returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok || result.success === false) {
    const detail = typeof result.errors?.[0]?.message === "string"
      ? result.errors[0].message
      : typeof result.error?.message === "string"
        ? result.error.message
        : `Cloudflare Workers AI returned HTTP ${response.status}.`;
    throw new Error(detail);
  }

  const output = result.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) {
    throw new Error("Cloudflare Workers AI returned no text output.");
  }
  return output.trim();
}

async function handleAiPromptCommand(interaction, veniceApiKey, groqApiKey, cloudflareAccountId, cloudflareApiToken, geminiApiKey, openrouterApiKey) {
  const keys = {
    venice: typeof veniceApiKey === "string" ? veniceApiKey.trim() : "",
    groq: typeof groqApiKey === "string" ? groqApiKey.trim() : "",
    cloudflareAccountId: typeof cloudflareAccountId === "string" ? cloudflareAccountId.trim() : "",
    cloudflareApiToken: typeof cloudflareApiToken === "string" ? cloudflareApiToken.trim() : "",
    gemini: typeof geminiApiKey === "string" ? geminiApiKey.trim() : "",
    openrouter: typeof openrouterApiKey === "string" ? openrouterApiKey.trim() : ""
  };
  const hasCloudflare = Boolean(keys.cloudflareAccountId && keys.cloudflareApiToken);
  if (!keys.venice && !keys.groq && !hasCloudflare && !keys.gemini && !keys.openrouter) {
    await interaction.reply({ content: "No AI provider is configured. Add Groq, Cloudflare Workers AI, Gemini, OpenRouter, or Venice credentials to .private/config.json and restart Curio.Byte.", ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const prompt = interaction.options.getString("prompt", true);
  const context = interaction.options.getString("context");
  const input = context ? "Context:\n" + context + "\n\nRequest:\n" + prompt : prompt;
  const providers = [
    { name: "Groq", key: keys.groq, run: () => requestGroq(keys.groq, input) },
    { name: "Cloudflare Workers AI", key: hasCloudflare, run: () => requestCloudflare(keys.cloudflareAccountId, keys.cloudflareApiToken, input) },
    { name: "Gemini", key: keys.gemini, run: () => requestGeminiWithFallback(keys.gemini, input) },
    { name: "OpenRouter", key: keys.openrouter, run: () => requestOpenRouter(keys.openrouter, input) },
    { name: "Venice", key: keys.venice, run: () => requestVenice(keys.venice, input) }
  ];
  let answer;
  let provider;
  for (const candidate of providers) {
    if (!candidate.key) continue;
    try { answer = await candidate.run(); provider = candidate.name; break; }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const redacted = [keys.venice, keys.groq, keys.cloudflareApiToken, keys.cloudflareAccountId, keys.gemini, keys.openrouter, input].filter(Boolean).reduce((value, secret) => value.replaceAll(secret, "[REDACTED]"), reason).slice(0, 350);
      console.warn(candidate.name + " failed; trying the next configured provider:", redacted);
    }
  }
  if (!answer) {
    await interaction.editReply({ content: "All configured AI providers are temporarily unavailable or could not process the request. Please try again shortly." });
    return;
  }
  const messages = splitResponse(answer);
  await interaction.editReply({ content: "**Answered by " + provider + "**\n\n" + messages[0], allowedMentions: { parse: [] } });
  for (const message of messages.slice(1)) await interaction.followUp({ content: message, ephemeral: true, allowedMentions: { parse: [] } });
}

async function handleAiPromptTestCommand(interaction, veniceApiKey, groqApiKey, cloudflareAccountId, cloudflareApiToken, geminiApiKey, openrouterApiKey) {
  const provider = interaction.options.getString("provider", true);
  const keys = {
    venice: typeof veniceApiKey === "string" ? veniceApiKey.trim() : "",
    groq: typeof groqApiKey === "string" ? groqApiKey.trim() : "",
    cloudflareAccountId: typeof cloudflareAccountId === "string" ? cloudflareAccountId.trim() : "",
    cloudflareApiToken: typeof cloudflareApiToken === "string" ? cloudflareApiToken.trim() : "",
    gemini: typeof geminiApiKey === "string" ? geminiApiKey.trim() : "",
    openrouter: typeof openrouterApiKey === "string" ? openrouterApiKey.trim() : ""
  };
  const labels = { groq: "Groq", cloudflare: "Cloudflare Workers AI", gemini: "Gemini", openrouter: "OpenRouter", venice: "Venice" };
  const configured = { groq: Boolean(keys.groq), cloudflare: Boolean(keys.cloudflareAccountId && keys.cloudflareApiToken), gemini: Boolean(keys.gemini), openrouter: Boolean(keys.openrouter), venice: Boolean(keys.venice) };
  if (!labels[provider]) { await interaction.reply({ content: "Choose Groq, Cloudflare Workers AI, Gemini, OpenRouter, or Venice.", ephemeral: true }); return; }
  if (!configured[provider]) { await interaction.reply({ content: labels[provider] + " is not fully configured in .private/config.json. Check its credentials and restart Curio.Byte.", ephemeral: true }); return; }
  await interaction.deferReply({ ephemeral: true });
  try {
    const testPrompt = "Reply with exactly: Curio.Byte provider test passed";
    let output;
    if (provider === "groq") output = await requestGroq(keys.groq, testPrompt);
    else if (provider === "cloudflare") output = await requestCloudflare(keys.cloudflareAccountId, keys.cloudflareApiToken, testPrompt);
    else if (provider === "gemini") output = await requestGeminiWithFallback(keys.gemini, testPrompt);
    else if (provider === "openrouter") output = await requestOpenRouter(keys.openrouter, testPrompt);
    else output = await requestVenice(keys.venice, testPrompt);
    await interaction.editReply({ content: "✅ **" + labels[provider] + " API test succeeded.**\n\nResponse: " + output.slice(0, 800), allowedMentions: { parse: [] } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const redacted = [keys.venice, keys.gemini, keys.groq, keys.openrouter, keys.cloudflareApiToken, keys.cloudflareAccountId].filter(Boolean).reduce((value, secret) => value.replaceAll(secret, "[REDACTED]"), message).slice(0, 350);
    console.error(labels[provider] + " API test failed:", redacted);
    await interaction.editReply({ content: "❌ **" + labels[provider] + " API test failed.** Check the provider credentials and permissions in .private/config.json. Error: " + redacted, allowedMentions: { parse: [] } });
  }
}
module.exports = { aiPromptCommand, handleAiPromptCommand, handleAiPromptTestCommand };
