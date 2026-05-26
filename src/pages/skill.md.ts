import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `# Wix Headless Skill

> Agent-native skill that turns a single "build me a site" prompt into a real Wix-backed site — commerce, bookings, CMS, identity, hosted runtime. Discovery → scaffold → design → wire features → ship, in one flow.

## Install

If you don't have the Wix CLI installed yet, install it first:

\`\`\`bash
npm install -g @wix/cli
\`\`\`

Then from the root of your project, run:

\`\`\`bash
wix skills add
\`\`\`

Then read \`SKILL.md\` from the installed skill and follow it end to end.

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
