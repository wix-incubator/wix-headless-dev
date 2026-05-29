import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const HOST = "https://wix-headless.dev";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `# Wix Headless Skill

> Agent-native skill that turns a single "build me a site" prompt into a real Wix-backed site — commerce, bookings, CMS, identity, hosted runtime. Discovery → scaffold → design → wire features → ship, in one flow.

## Install

Extract the bundle into any directory you control. \`<SKILL_ROOT>\` below is a placeholder — substitute whatever path makes sense for your runtime.

\`\`\`bash
mkdir -p <SKILL_ROOT>
curl -fsSL ${HOST}/skill.tgz | tar -xzf - -C <SKILL_ROOT> --strip-components=1
\`\`\`

Then read \`<SKILL_ROOT>/SKILL.md\` and follow it end to end. Every \`<SKILL_ROOT>/...\` path inside that document resolves under the directory you chose.
`;

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
    },
  });
