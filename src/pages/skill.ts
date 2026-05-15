import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const HOST = "https://wix-headless.dev";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `# Wix Headless Skill

> Agent-native skill that turns a single "build me a site" prompt into a real Wix-backed site — commerce, bookings, CMS, identity, hosted runtime. Discovery → scaffold → design → wire features → ship, in one flow.

## Install

Pick any directory for the bundle and extract it there. \`<SKILL_ROOT>\` in the example below is just a placeholder for the path you chose — substitute whatever your runtime prefers (Claude Code uses \`~/.claude/skills/wix-headless\` so it registers as a native skill; other runtimes can pick any path).

\`\`\`bash
SKILL_ROOT="<pick a directory>"
mkdir -p "$SKILL_ROOT"
curl -fsSL ${HOST}/skill.tgz | tar -xzf - -C "$SKILL_ROOT" --strip-components=1
\`\`\`

Then read \`$SKILL_ROOT/SKILL.md\` and follow it end to end. Every \`<SKILL_ROOT>/...\` path inside that document resolves under the directory you chose.

## Browse without installing

The skill is hosted at <${UPSTREAM}/>. Start with [\`SKILL.md\`](${UPSTREAM}/SKILL.md) and follow its references (each \`<SKILL_ROOT>/<path>\` resolves to \`${UPSTREAM}/<path>\`).
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
