import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `# Wix Headless Skill

> Agent-native skill that turns a single "build me a site" prompt into a real Wix-backed site — commerce, bookings, CMS, identity, hosted runtime. Discovery → scaffold → design → wire features → ship, in one flow.

## Install

Pick **one** way to invoke the CLI and stick with it for the whole flow — don't mix \`npx @wix/cli\` and bare \`wix\` calls.

- **If the project already has \`@wix/cli\` as a local devDependency** (\`./node_modules/@wix/cli\` exists): use the local binary via \`npx wix …\` or \`./node_modules/.bin/wix …\`. Skip the install step below.
- **Otherwise**, install the CLI globally (only if it's not already on PATH):

\`\`\`bash
wix --version || npm install -g @wix/cli@latest
\`\`\`

Below, \`wix\` means whichever form you chose above.

Check if you are logged in:

\`\`\`bash
wix whoami
\`\`\`

If not logged in, run \`wix login\` **as a background process** so you can stream its stdout while it waits for the user. Watch for an \`awaiting_user\` JSON event:

\`\`\`json
{"event":"awaiting_user","userCode":"…","verificationUri":"…"}
\`\`\`

Surface the \`verificationUri\` and \`userCode\` to the user in plain prose. Then poll \`wix whoami\` every few seconds until it prints an email — that's the signal login completed. Don't proceed until then.

If \`wix.config.json\` already exists in the current directory, skip to "Install the skills" below — the project is already set up.

Otherwise, create a new Wix Headless project. \`<business-name>\` is the human brand name (spaces allowed, e.g. \`Acme Bakery\`). \`<project-name>\` is a 3-20 char slug — lowercase letters and digits only, no hyphens (e.g. \`acmebakery\`, not \`acme-bakery\`):

\`\`\`bash
npm create @wix/new@latest headless -- \\
  --business-name "<business-name>" \\
  --project-name "<project-name>" \\
  --site-template blank \\
  --no-publish
\`\`\`

The scaffold creates a \`./<project-name>/\` directory and installs npm dependencies into it. \`cd\` in before the next step:

\`\`\`bash
cd <project-name>
\`\`\`

## Install the skills

From the project root (the directory containing \`wix.config.json\`):

\`\`\`bash
wix skills add
\`\`\`

This installs the Wix skills into \`.agents/skills/\` (the universal location; the CLI also syncs them into any per-agent directory it detects). Re-running overwrites in place with no prompt — and may add new skills if the registry has grown — so only re-run if you want that.

Then read the entry-point skill and follow it end to end:

\`\`\`
.agents/skills/wix-headless/SKILL.md
\`\`\`

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
