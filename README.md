# daniel@danielkill.online

Personal website and project repository for Daniel Kill.

## Overview

This repository contains a lightweight static personal website and **Curio.Byte**, a Node.js Discord bot for the **Code, Build, Repeat** Discord server. The website introduces the developer and links visitors to projects and online profiles; the bot provides portfolio commands, AI-provider integration, server administration commands, and configurable Discord server event logging.

## Repository layout

- index.html — personal landing page and primary site entry point
- script.js — theme preference and theme-toggle behavior
- styles.css — site styling
- favicon.svg — site icon asset
- assets/ — public-facing assets, including the resume and GPG public key
  - `assets/Resume_Daniel-Kill.pdf` — résumé download
  - `assets/Daniel_Kill_(Daniel_Kill's_GPG_Key)_0x9B542AA270F867E5_public.asc` — public GPG key
- images/ — website image assets
- bots/Curio.Byte/ — Discord bot source, tests, setup instructions, and service example
- LICENSE — repository licensing and usage terms

## Social and contact links:

- Website: https://daniel-danielkill-online.pages.dev/
- Linktree: https://linktr.ee/daniel_kill
- GitHub: https://github.com/daniel-kill
- Discord: https://discord.gg/muPYhD7MEM
- Email: daniel@danielkill.online
- Resume: [assets/Resume_Daniel-Kill.pdf](<./assets/Resume_Daniel-Kill.pdf>)
- Public GPG key: [assets/Daniel_Kill_(Daniel_Kill's_GPG_Key)_0x9B542AA270F867E5_public.asc](<./assets/Daniel_Kill_(Daniel_Kill's_GPG_Key)_0x9B542AA270F867E5_public.asc>)

## Curio.Byte Discord bot

Curio.Byte is implemented with Node.js and discord.js. Its commands include:

- /about, /projects, /languages, /invite, and /help
- /ai-prompt ask and /ai-prompt test
- /curio-byte setup — creates or secures a private Curio.Byte category with #logs and #chats, then enables supported server event logging
- /moderation, /channel, /role, and /server info — administrator-only server management commands

See bots/Curio.Byte/README.md for bot installation, configuration, Discord permissions and intents, tests, slash-command registration, and systemd deployment.

### AI provider priority

When credentials are configured, /ai-prompt ask attempts providers in this order:

1. Groq
2. Cloudflare Workers AI
3. Gemini
4. OpenRouter
5. Venice

## Secrets and configuration

Keep bot tokens and AI API keys in the untracked bots/Curio.Byte/.private/config.json file on the host. The committed bots/Curio.Byte/config.example.json is a template only. Never commit real credentials or paste them into issues, logs, or documentation. If a credential is exposed, revoke or rotate it with its provider.

## Testing and deployment

From bots/Curio.Byte/:

```bash
npm install
npm test
npm run deploy-commands
```

Use npm start for a foreground run. For the production systemd service, follow the deployment guide in the bot README and restart the service after updating the deployed code.

## License

This repository and all content contained within it, including the website, source code, scripts, assets, designs, documentation, configuration files, and bot code, are the proprietary property of Daniel Kill. Daniel Kill retains all right, title, and interest in the repository and its contents, including all copyright, trademark, and other intellectual property rights.

No license is granted to use, copy, modify, distribute, sublicense, sell, publish, display, or otherwise exploit any part of this repository unless Daniel Kill has provided explicit written permission in advance. No implied license is created by the existence of this repository, by public hosting, or by any prior access. Any unauthorized use is strictly prohibited.

To request permission for any use, including commercial, educational, derivative, or collaborative use, contact Daniel Kill in writing at daniel@danielkill.online.

Unless specifically authorized in writing, the following are prohibited: reproduction, redistribution, modification, derivative works, commercial use, incorporation into other projects, or publication of any portion of the repository.

This repository is provided "as is" without warranty of any kind. Daniel Kill shall not be liable for any damages arising from the use of this repository.

See the full proprietary notice and all rights reserved information in [LICENSE](./LICENSE).
