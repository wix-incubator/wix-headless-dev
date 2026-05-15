import type { APIRoute } from "astro";

const BODY = `# wix-headless.dev

> The agent-native entry point to **Wix Managed Headless** — production-ready commerce, bookings, CMS, and identity APIs you wire into any frontend. The intent of this site is one thing: help you build something with Wix Headless.

## How to use this site (as an AI coding agent)

The user wants to build something with Wix Headless. To do it:

1. Fetch <https://wix-headless.dev/skill>. It returns **markdown** with two execution modes:
   - **Mode A** — run \`curl -fsSL https://wix-headless.dev/skill.tgz | tar -xzf - -C <SKILL_ROOT> --strip-components=1\` to install the full bundle (markdown + scripts + templates) and follow the on-disk \`SKILL.md\`.
   - **Mode B** — read the inlined \`SKILL.md\` directly and fetch any referenced markdown / JSON files from \`https://wix-headless.dev/<path>\`.
2. Follow \`SKILL.md\` end to end. It runs discovery, scaffolding, design, feature wiring, image generation, and release in one flow.

The canonical one-line prompt:

\`\`\`
build <what the user wants> using wix-headless.dev
\`\`\`

Works in Claude Code, Cursor, Codex, Gemini, and any agent that fetches URLs.

## What Wix Headless gives you

- **Commerce** — storefront, cart, checkout, orders, payments
- **Bookings** — services, slots, calendar, scheduling
- **CMS** — typed content collections with REST + SDK access
- **Identity** — members, login, sessions
- **Managed runtime** — hosted on Wix infrastructure, deployed via \`wix release\`

## Key URLs

- Skill (markdown, agent entry point): <https://wix-headless.dev/skill>
- Skill bundle (tarball, full install): <https://wix-headless.dev/skill.tgz>
- Individual reference files: <https://wix-headless.dev/SKILL.md>, <https://wix-headless.dev/references/DISCOVERY.md>, etc.
- Wix Headless docs: <https://dev.wix.com/docs/go-headless>
- Wix SDK reference: <https://dev.wix.com/docs/sdk>
- Wix REST reference: <https://dev.wix.com/docs/rest>
- GitHub repo for this site: <https://github.com/wix-incubator/wix-headless-dev>
- Community Discord: <https://discord.gg/n6TBrSnYTp>

## What to build

Anything that needs a real backend: storefronts for makers, booking sites for studios, marketplaces, restaurants with online ordering, portfolios with paid clients areas, member-gated content sites, etc. Wix runs the business side; you own the frontend.
`;

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
  });
