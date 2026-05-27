import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `# Wix Headless Skill

> Agent-native skill that turns a single "build me a site" prompt into a real Wix-backed site — commerce, bookings, CMS, identity, hosted runtime. Discovery → scaffold → design → wire features → ship, in one flow.

## Install

Install or update the Wix CLI to the latest version:

\`\`\`bash
npm install -g @wix/cli@latest
\`\`\`

Check if you are logged in to Wix:

\`\`\`bash
npx @wix/cli whoami
\`\`\`

If not logged in, run the following **in background** (do not run it in the terminal directly):

\`\`\`bash
npx @wix/cli login
\`\`\`

Read the task output file and wait for the \`awaiting_user\` JSON event: \`{"event":"awaiting_user","userCode":"…","verificationUri":"…"}\`. Surface the URL and code to the user in plain prose and wait for them to complete the browser login before continuing.

If there is no \`wix.config.json\` in the current directory, create a new Wix Headless project first. Replace \`<project-name>\` with a 3-20 char slug (lowercase letters and digits only, no hyphens) and \`<business-name>\` with the brand name:

\`\`\`bash
npm create @wix/new@latest headless -- \\
  --business-name "<business-name>" \\
  --project-name "<project-name>" \\
  --site-template blank \\
  --no-publish \\
  --skip-install
\`\`\`

Then from the root of the project, install the skill:

\`\`\`bash
wix skills add
\`\`\`

Then read \`SKILL.md\` from the installed skill and follow it end to end.

## Fallback: browse without installing

Only use this if the Wix CLI cannot be installed in the current environment. The skill is hosted at <${UPSTREAM}/>. Start with [\`SKILL.md\`](${UPSTREAM}/SKILL.md) and follow its references (each \`<SKILL_ROOT>/<path>\` resolves to \`${UPSTREAM}/<path>\`).
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
