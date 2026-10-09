# Curio.Byte

Curio.Byte is a Discord bot I built for the **Code, Build, Repeat** server. It shares my projects, answers prompts through configured AI providers, and gives server admins moderation and management commands.

## Features

- `/about` — show information about the bot
- `/projects` — browse the projects listed in the bot
- `/languages` — see the languages and tools I use
- `/ai-prompt ask` — send a prompt to a configured AI provider (the reply is private)
- `/ai-prompt test` — send a test request to one provider (the reply is private)
- `/curio-byte setup` — set up private `#logs` and `#chats` channels and turn on event logging (admins only)
- `/invite` — get the bot's invite link privately
- `/help` — list available commands
- `/moderation`, `/channel`, `/role` — moderation and server management commands (admins only)
- `/server info` — show basic server details (admins only)

## Requirements

- Node.js 20 or newer
- A Discord application and bot configured in the [Discord Developer Portal](https://discord.com/developers/applications)

## Setup

In this directory, install dependencies and copy the example config:

```sh
npm install
mkdir -p .private
cp config.example.json .private/config.json
```

Set `botToken` and `applicationId` in `.private/config.json`. Those are required to start the bot and register its slash commands. Then run:

```sh
npm run deploy-commands
npm start
```

AI providers are optional. Add a key for any provider you want to use with `/ai-prompt`; for Cloudflare, set both `cloudflareAccountId` and `cloudflareApiToken`.

- [Groq](https://console.groq.com/keys) is tried first.
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) is next. Its token needs Workers AI Read and Edit permissions.
- [Google AI Studio](https://aistudio.google.com/apikey) provides the Gemini key. Restrict standard keys to the Gemini API.
- [OpenRouter](https://openrouter.ai/keys) uses its `openrouter/free` router; free-plan limits apply.
- Venice is tried last.

## Curio.Byte private channels and server event logging

The bot needs **Manage Channels**, **Send Messages**, **Embed Links**, and **Read Message History** to create and use its private channels. In the Discord Developer Portal, enable **Server Members Intent** and **Message Content Intent** under **Bot → Privileged Gateway Intents**. These intents are used for member events and message edits/deletions.

Then run **`/curio-byte setup`** in the server as an administrator.

Setup creates or reuses the `Curio.Byte` category and its `#logs` and `#chats` text channels. It hides them from `@everyone`, grants access to the bot, and secures matching channels that already exist. Discord command names cannot contain periods, so the command is `/curio-byte`, not `/curio.byte`.

The log channel records member joins and leaves, nickname and role changes, timeouts, voice-state changes, channel and role changes, message edits and deletions, bans, server description changes, and custom emoji changes. Discord may not provide the content of a deleted message; bulk deletion logs the count only. Logs can contain private message text, so limit access to trusted admins.

## Run as a systemd service

On Linux with systemd 240 or newer, install the dependencies and configure `.private/config.json` first. Register the slash commands with `npm run deploy-commands`. Create the ignored log directory and allow the service account to write to it:

```sh
mkdir -p .logs
```

The service writes output to `.logs/output.log` and errors to `.logs/error.log`, not to `journalctl`. Set up log rotation if you plan to leave it running.

1. Copy `Curio.Byte.example.service` to `/etc/systemd/system/Curio.Byte.service`:

   ```sh
   sudo cp Curio.Byte.example.service /etc/systemd/system/Curio.Byte.service
   ```

2. Edit the unit file. Replace `YOUR_LINUX_USER`, `/path/to/Curio.Byte`, and `/path/to/node` with the service account, project directory, and Node.js executable paths. The account needs read access to the project and `.private/config.json`, and write access to `.logs/`.

3. Reload systemd, enable the service to start at boot, and start it:

   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable --now Curio.Byte.service
   ```

4. Check its status and logs:

   ```sh
   sudo systemctl status Curio.Byte.service
   ```

   Follow the application logs directly:

   ```sh
   tail -f .logs/output.log
   tail -f .logs/error.log
   ```

Restart after updates with `sudo systemctl restart Curio.Byte.service`. To stop it, run `sudo systemctl stop Curio.Byte.service`; to keep it from starting at boot, run `sudo systemctl disable Curio.Byte.service`.

## Configuration and secrets

Keep `.private/config.json` on the host; `.private/` is ignored by Git. The example config has empty values and is safe to commit. `botToken` and `applicationId` are required. AI keys and `inviteUrl` are optional; `publicKey` is unused. If `inviteUrl` is empty, the bot builds one from `applicationId`. Revoke and replace any exposed token or API key.

`/ai-prompt ask` requires a prompt and accepts optional context. It replies privately and names the provider it used. Prompts and context are sent to that provider, so don't include anything you wouldn't want to share with it. The bot tries configured providers in this order, moving to the next if one fails: Groq (`openai/gpt-oss-20b`), Cloudflare Workers AI (`@cf/zai-org/glm-4.7-flash`), Gemini (`gemini-3.8-flash`, with `gemini-3.7-flash` as a temporary-load fallback), OpenRouter (`openrouter/free`), then Venice (`llama-3.3-70b`).

`/ai-prompt test` sends one request to the provider you select; it doesn't use fallbacks. Both AI commands reply privately.

## Administration commands

These commands are server-only and require Discord's **Administrator** permission. After changing command definitions, run `npm run deploy-commands` again. Global commands can take a while to update.

- `/moderation ban`, `/moderation kick`, and `/moderation timeout` act on a selected member; timeouts accept 1–40,320 minutes.
- `/moderation warn` records a warning in `.private/warnings.jsonl` and attempts to notify the member by DM. `/moderation warnings` lists recent records, and `/moderation clear-warnings` permanently clears a member's records after explicit confirmation.
- `/moderation purge` bulk-deletes 1–100 recent messages in the current channel. Discord does not bulk-delete messages older than 14 days.
- `/channel create`, `/channel edit`, and `/channel delete` create, modify, or delete text, voice, and category channels. Deletion requires explicit confirmation. `/channel lock` and `/channel unlock` save and restore the channel's prior `@everyone` send/connect permissions; lock state is kept in `.private/channel-locks.json`.
- `/role create`, `/role edit`, and `/role delete` manage role names, colors, display settings, and role lifetime. `/role add` and `/role remove` assign roles to members. `/role permission` grants or revokes a permission by its exact discord.js `PermissionFlagsBits` name (for example, `ManageChannels`); granting `Administrator` gives that role broad server access. Deletion requires explicit confirmation.
- `/server info` displays basic server details.

The bot also needs the Discord permissions for each action, such as **Ban Members**, **Manage Channels**, or **Manage Roles**. Its highest role must be above any role it needs to manage. Discord's role hierarchy and server-owner restrictions still apply.

## Invite permissions

The bot uses gateway intents for server and channel updates, member events, messages, message content, voice states, and moderation events. Enable the privileged intents in the Developer Portal as described above. Give the bot only the permissions it needs when creating an invite.

## Showcase notes

The `/projects` command reads its entries from the bot's project list. Update that list when adding or changing projects.
