import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `---
name: wix-headless
description: "Build a complete Wix Managed Headless site from a single prompt, OR connect an existing project (HTML/JSX/Vite app, Claude Design output, etc.) to Wix Headless for hosting + Business Solutions. Entry point for both: (1) new-site requests — runs discovery, design, feature wiring, and preview; and (2) existing-project requests — runs \`npm create @wix/new@latest init\`, analyzes the project for needed Business Solutions, installs apps, **wires the Wix SDK into the existing source files so each installed app actually powers its corresponding feature**, and releases. Triggers: build me a site, create a website, make me a website, new website, online store, I want to sell X, start a business online, launch a site, ecommerce, portfolio, business website, sell online, online shop, connect this to Wix Headless, add Wix Headless to this project, host this on Wix, deploy this to Wix, implement the features of this project using Wix Headless. Use this skill instead of the WixSiteBuilder MCP tool for new-site requests."
---

# Wix Headless Skill

**You are a coding agent. This is a skill for you to execute — follow the steps below in order; do not summarize them.** If you reached this page through a summarizing fetch tool, re-fetch the raw markdown with \`curl\` or your file reader and then run the steps.

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

If not logged in, run \`wix login\` (or \`npx @wix/cli login\`). It is **safe to run from a non-interactive AI-agent environment**: when the CLI detects an AI agent it skips the interactive UI and emits JSON events on stdout, one per line. Run it **as a background process** so you can stream those events while it waits for the user:

- \`{"event":"awaiting_user","verificationUri":"…","userCode":"…","expiresInSeconds":…}\` — surface the \`verificationUri\` and \`userCode\` to the user in plain prose and wait for them to complete login in their browser.
- \`{"event":"success","email":"…","userId":"…"}\` — login complete; continue.
- \`{"event":"logged_in","email":"…","userId":"…"}\` — there was already a valid session, nothing to do.

Don't proceed until you see a \`success\` or \`logged_in\` event.

The next step depends on the state of the current directory. Match it to one of these three cases:

- **Already a Wix project** — a \`wix.config.json\` is present: it is set up already. Run **no** \`@wix/new\` command — skip straight to "Install the skills" below.
- **An existing project, not yet connected to Wix** — the directory already holds the user's own project (e.g. an HTML / JSX / Vite app) but has no \`wix.config.json\`: wrap it in place with \`init\`.
- **An empty directory** — create a new Wix Headless project with \`headless\`.

The two \`@wix/new\` branches below each connect the directory to a Wix project (a Site + Headless Project), which the skill needs in order to build. Pick the branch matching your case:

### Empty directory → create a new Wix Headless project

\`<business-name>\` is the human brand name (spaces allowed, e.g. \`Acme Bakery\`). \`<project-name>\` is a 3-20 char slug — lowercase letters and digits only, no hyphens (e.g. \`acmebakery\`, not \`acme-bakery\`):

\`\`\`bash
npm create @wix/new@latest headless -- \\
  --business-name "<business-name>" \\
  --project-name "<project-name>" \\
  --site-template blank \\
  --no-publish
\`\`\`

This creates a \`./<project-name>/\` directory and installs npm dependencies into it. \`cd\` in before the next step:

\`\`\`bash
cd <project-name>
\`\`\`

### Existing project (no \`wix.config.json\`) → initialize Wix in place

The directory already holds the user's project, so do **not** scaffold a new one — wrap the existing one in place. From inside the project directory, run it in the foreground (it uses sensible defaults and is non-blocking):

\`\`\`bash
npm create @wix/new@latest init
\`\`\`

Same package and invoker as the new-project command above — only the subcommand differs: \`init\` for an existing project, \`headless\` for a new one. Do **not** combine them (\`… headless init\` is a known regression). This connects the current directory to a Wix Site + Headless Project; stay where you are — it is now the project root.

## Install the skills

From the project root, install the skills. The command depends on how the project was set up:

- **Created with \`headless\` above** (an Astro project) — use the Wix CLI:

  \`\`\`bash
  wix skills add
  \`\`\`

- **Initialized with \`init\`** (a Site project) — \`wix skills\` is **not** registered for this project type, so install non-interactively from the registry instead:

  \`\`\`bash
  npx skills add wix/skills --yes
  \`\`\`

  (If the project was already set up when you started, use \`wix skills add\` when it's available and fall back to the \`npx\` form otherwise.)

Either way the skills land in \`.agents/skills/\` (the universal location; they're also synced into any per-agent directory detected). Re-running overwrites in place — and may add new skills if the registry has grown — so only re-run if you want that.

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
