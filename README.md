# Curio.Byte & Dotfiles Repository

The central repository for **Code, Build, Repeat**, featuring personal configuration dotfiles and the custom **`Curio.Byte`** Discord bot.

---

## 🤖 Curio.Byte Discord Bot

`Curio.Byte` is a modular, multi-purpose Discord bot built with `discord.js` designed for server management, interactive community features, automated backups, and portfolio exploration.

### 🚀 Key Features & Command Suite
*   **`/analytics`** — Administrative command to inspect live server metrics (member breakdowns, channel/role stats) and backup system analytics.
*   **`/poll`** — Create interactive, button-based server polls.
*   **`/project`** — Search portfolio projects from Code, Build, Repeat by keyword or technology stack.
*   **`/ai-prompt`** — Multi-provider AI assistant integration supporting Groq, Cloudflare Workers AI, Gemini, OpenRouter, and Venice.
*   **`/curio-byte setup`** — Automatically provision private administrative channels and enable comprehensive server event audit logging.
*   **`/moderation` & Administrative Tools** — Channel management, role configurations, and server health checks restricted to administrators.

---

## ⚙️ Automated CI/CD Pipeline

The bot runs on a self-hosted VPS (`srv1752914`) utilizing user-level `systemd` services with lingering enabled. 
*   **Zero-Touch Deployment:** Powered by GitHub Actions (`appleboy/ssh-action`), every push to `main` automatically updates the VPS working tree via HTTPS remote fetching and cleanly restarts the `curio-byte` service with the correct D-Bus/XDG runtime environment.
*   **Automatic Registration:** On startup, `Curio.Byte` automatically syncs and registers all slash command definitions globally.

---

## 📁 Repository Structure

```text
├── bots/
│   └── Curio.Byte/
│       ├── src/
│       │   ├── commands/       # Modular command implementations (poll, project, analytics)
│       │   ├── index.js        # Main bot entry point & auto-registration
│       │   ├── server-backup.js # Automated server state backup engine
│       │   └── server-setup.js  # Audit logging & administrative setup utilities
│       └── .private/           # Local configuration and tokens (ignored)
├── .github/
│   └── workflows/
│       └── deploy.yml          # Zero-touch CI/CD deployment automation
└── README.md
```
Stay curious. Keep building. Repeat.
