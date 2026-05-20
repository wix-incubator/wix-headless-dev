# wix-headless.dev

Source for **[wix-headless.dev](https://wix-headless.dev)** — the agent-native entry point to Wix Managed Headless.

The site itself is a Wix Headless site. The skill it advertises (`/skill`) is the same skill it was built with.

## What it does

- **Homepage** — an editable "try prompt" CTA. Click Copy, paste into any coding agent (Claude Code, Cursor, Codex, …), and the agent fetches the skill and ships a Wix site.
- **`/skill`** — edge proxy serving [`dev.wix.com/skills/wix-headless.tgz`](https://dev.wix.com/skills/wix-headless.tgz). This is the tarball your agent downloads.
- **`/[...path].md`** — catchall proxy for nested markdown references inside the skill.

## Stack

Astro 5 + React (one client island for the prompt) + the Wix Astro adapter. Deployed on the Wix-managed runtime via `wix release`.

## Local development

```bash
npm install
npm run dev     # http://localhost:4321
```

## Deploy

```bash
npx wix build
npx wix preview   # staging URL
npx wix release   # production
```

## Links

- Live site — https://wix-headless.dev
- Source repo — https://github.com/wix-incubator/wix-headless-dev
- Skill source — https://dev.wix.com/skills/wix-headless
- Wix Headless docs — https://dev.wix.com/docs/go-headless
- Wix SDK docs — https://dev.wix.com/docs/sdk
- Community Discord — https://discord.gg/n6TBrSnYTp
