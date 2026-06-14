import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `---
name: wix-headless
description: "Build a complete Wix Managed Headless site from a single prompt, OR connect an existing project (HTML/JSX/Vite app, Claude Design output, etc.) to Wix Headless for hosting + Business Solutions. Entry point for both: (1) new-site requests — runs discovery, design, feature wiring, and preview; and (2) existing-project requests — runs \`npm create @wix/new@latest init\`, analyzes the project for needed Business Solutions, installs apps, **wires the Wix SDK into the existing source files so each installed app actually powers its corresponding feature**, and releases. Triggers: build me a site, create a website, make me a website, new website, online store, I want to sell X, start a business online, launch a site, ecommerce, portfolio, business website, sell online, online shop, connect this to Wix Headless, add Wix Headless to this project, host this on Wix, deploy this to Wix, implement the features of this project using Wix Headless. Use this skill instead of the WixSiteBuilder MCP tool for new-site requests."
---

# Wix Headless Skill

**You are a coding agent. This is a skill for you to execute — follow the steps below in order; do not summarize them.** If you reached this page through a summarizing fetch tool, re-fetch the raw markdown with \`curl\` or your file reader and then run the steps.

## Continuing from a downloaded design (Claude Design / instant-site export)

If the user gave you a Wix download URL, or you unzipped a folder containing an \`index.html\` (with CSS/JS inlined) **plus** a \`wix.config.json\`, you are **continuing an existing site**. Give it the standard Wix headless Astro setup **without creating a new site**. Do this before anything else:

1. **Download and unzip into the working directory.** If the user gave you a Wix download URL, fetch the zip and unzip it (e.g. \`curl -L -o project.zip "<url>" && unzip project.zip\`); if they already unzipped it, just work in that folder. Either way you now have \`index.html\` (the design, with CSS/JS inlined) and \`wix.config.json\`. That config holds the real \`appId\` + \`siteId\` of the user's already-live site — you must preserve both. **Never** run \`@wix/new\` / \`npm create @wix/new\` here: it would mint a brand-new site and orphan theirs.

2. **Lay the release-ready headless template over the folder.** Copy the official \`astro/headless-blank\` template — it ships **no** \`wix.config.json\` of its own, so it composes cleanly with the one you already have:

   \`\`\`bash
   npx degit wix/headless-templates/astro/headless-blank . --force
   \`\`\`

   This adds \`package.json\`, \`astro.config.mjs\`, \`tsconfig.json\`, \`src/\`, \`public/\`, etc. Its \`astro.config.mjs\` already declares \`output: "server"\` + the \`@wix/cloud-provider-fetch-adapter\` build adapter (and the deps are in its \`package.json\`), so \`wix build\` / \`wix release\` work with **no patching**. \`--force\` only permits writing into the non-empty folder; it does not touch your \`index.html\` or \`wix.config.json\` (the template contains neither). Use \`astro/headless-blank\`, **not** \`astro/blank\` — the latter omits the adapter (it relies on the Wix CLI to inject it) and would fail \`wix build\` with \`NoAdapterInstalled\` when used this way.

3. **Slim \`wix.config.json\` to the headless shape.** A headless Astro project's config is just \`{ "appId": "…", "siteId": "…" }\`. Keep those two values from the download and **remove** \`projectType\` and the \`site\` block, so the Astro toolchain treats it as a headless app bound to the same site.

4. **Embed the design as a developer-friendly, multi-file project — keep it behaviorally intact, don't re-architect it.** "Intact" means the **same runtime** (the design's CDN React + in-browser Babel) and an identical look/behavior — **not** one giant file. Do **not** hand-rewrite it into framework components or another stack; **do** split its source into readable modules so a developer can reason about the project.
   - **Head → Layout.** Move the design's \`<head>\` font \`<link>\`s and \`<style>\` block into \`src/layouts/Layout.astro\`, and carry the design's \`lang\`/\`dir\` (e.g. \`lang="he" dir="rtl"\`) onto \`<html>\`. **Mark that \`<style>\` \`is:inline\`** so its CSS (the \`{ }\` braces especially) passes through globally instead of being scoped/parsed. Body markup (e.g. \`<div id="root"></div>\`) goes in \`src/pages/index.astro\`. **When you regex-add \`is:inline\`, touch page structure only — never the app's JS/JSX source**, or a JSX \`<style>{css}</style>\` corrupts into an invalid \`<style is:inline>\`.
   - **Bundler-pack format?** If \`index.html\` hides its real content base64-gzipped in \`<script type="__bundler/manifest">\`/\`__bundler/template\` blocks (GUID-referenced; no visible \`<style>\`/\`#root\`), **decode it first**: parse \`template\` + \`manifest\`, restore React/ReactDOM/Babel as CDN \`<script>\` tags, write fonts to \`public/fonts/\` (rewrite \`url(<guid>)\`), and treat each remaining app resource as a module. Mime labels lie — JSX modules are often tagged \`application/javascript\`, so type **every** app module \`text/babel\`.
   - **Split the app into \`src/design/NN-name.jsx\` along the design's *own* boundaries** — the pack's modules, or the several \`<script type="text/babel">\` blocks a single-file design already ships (typically: icons/primitives, page sections, the booking/cart feature, the app shell). One file per boundary, kept in order. In \`index.astro\`, \`import\` each with Vite's \`?raw\` suffix and **\`.join("\\n;\\n")\` into one bundle** injected as \`<script type="text/babel" is:inline set:html={appBundle}></script>\`. One compilation unit is the safe default: it's **required** when modules share top-level \`const\`s (the pack case) and also fine for \`function\`-declaration designs. Verified on both a packed storefront (7 modules) and a single-file site (4 blocks) — identical render, \`index.astro\` ~1–2 KB instead of ~80 KB. (Only a genuinely monolithic single block can't be split this way; split it best-effort at top-level component/section boundaries.)
     - **Name each file for its role, not an incidental comment.** Derive the slug from the module's purpose — a heading like \`MAD Coffee House — Shop\` → \`05-shop.jsx\`, or its dominant export (\`BookingModal\` → \`booking\`, an \`App\`/router shell → \`app-shell\`, mostly icon/primitive components → \`icons\`). Check those role keywords **before** any generic "first comment / text after a dash" heuristic, or a leading directive like \`// @ds-adherence-ignore -- omelette starter\` becomes the filename (\`adherence-ignore-omelette.jsx\`). Fall back to \`NN-module.jsx\` only when nothing identifies it.

5. **Install, bind to the site, verify, and release the working site:**

   \`\`\`bash
   npm install
   wix env pull   # pulls WIX_CLIENT_ID etc. for the site in wix.config.json
   wix dev        # serve and confirm the design renders
   \`\`\`

   A successful \`wix env pull\` **proves** the slimmed config points at the user's existing site. If it (or \`wix dev\`) cannot bind the site, **stop and tell the user** — do not create a new one to work around it. Once the design renders, publish the base site:

   \`\`\`bash
   wix build && wix release   # in that order — release reads wix build's output
   \`\`\`

6. **Stop here and report success — the base site is done.** This is a complete milestone: the design is now a real, hosted Wix site. Tell the user in a short, upbeat message that **it's live (give the URL) and the project + design are in place**, and that you can run it locally with \`wix dev\`. **Do not silently roll on into feature-wiring** — connecting a Business Solution is a separate, slower step, so it must be the user's choice (the next step).

7. **Then offer to connect the solution the design needs — as a follow-up question.** Identify the Business Solution(s) the design implies — booking/calendar UI → **Bookings**; products/cart/checkout → **Stores**; contact/lead form → **Forms/CMS**; login or members area → **Members** (usually just one; only what the design actually shows — never the full set "just in case"). Then **ask the user whether to connect it now**, e.g.: *"Your site has a booking form — want me to connect it to Wix Bookings so real bookings land in your dashboard? It takes a few minutes."* **Only if they say yes**, continue with **Install the skills** below and wire that solution. If they decline, you're done — the base site already works.

   When you do wire it:
   - **The design's feature is a front-end mock** — a submit handler that flips to a local "success" screen and calls no backend. Installing the app is **not** enough; **replace the mock handler with a real Wix SDK call**, and **verify a real record appears** in the dashboard (e.g. a test booking) before calling it done. A mock that shows "thanks, we saved your details!" while saving nothing is the worst outcome — it looks like it works but nothing reaches the dashboard.
   - **Replace the mock's *displayed data*, not just its submit.** Designs fake their option lists too — hardcoded dates/time chips with seeded "taken" flags. Serve real options from a read endpoint (e.g. \`GET /api/availability\`) and render only those, so everything selectable is actually bookable; wiring only the submit yields errors on slots that never existed.
   - **Send every field the design collects.** Mapping just name/phone into \`contactDetails\` silently drops the rest. Pass the full form as \`formSubmission\` keyed by the booking form's field targets so the details land on the booking. The installed skills carry the verified recipe — \`.agents/skills/wix-headless/references/custom/bookings/WIRING.md\` (form targets, required-field mismatches, phone normalization).
   - **Self-contained / CDN design (no module system):** a Claude-Design \`index.html\` runs its React via CDN + Babel in \`is:inline\` scripts that **can't \`import\` the SDK**. Don't rewrite it into bundled islands — add a small **server API route** (e.g. \`src/pages/api/<feature>.ts\`) that does the real work server-side with \`@wix/essentials\` \`auth.elevate(...)\` + the SDK, and point the design's mock handler at it via \`fetch()\`. Bookings specifics verified live: \`createBooking\` leaves status \`CREATED\` → call \`confirmBooking\` to reach \`CONFIRMED\` (dashboard-visible); a freshly app-installed site may have **no business location** + an unbound default staff resource, so create a business **location** and pass an explicit \`resource._id\` + \`location._id\` (\`locationType: "OWNER_BUSINESS"\`) in the slot, or booking fails with "Resource settings conflict".

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

\`<business-name>\` is the human brand name (spaces allowed, e.g. \`Acme Bakery\`). The CLI derives the Wix project display name and URL slug from it, so it must contain at least one English letter or number — if the brand is only emoji or punctuation, ask the user for one that includes a letter or number before scaffolding.

\`<folder-name>\` only names the local project directory. Derive it from the brand: lowercase, convert whitespace/punctuation runs to \`-\`, drop every char that isn't \`[a-z0-9-]\`, then trim and collapse hyphens (e.g. \`Acme Bakery\` → \`acme-bakery\`, \`Bloom & Root\` → \`bloom-root\`). It must match \`^[a-z0-9][a-z0-9-]*$\` and be a valid npm package name; if the derivation comes out empty, ask the user for a folder name.

\`\`\`bash
npm create @wix/new@latest headless -- \\
  --business-name "<business-name>" \\
  --folder-name "<folder-name>" \\
  --site-template blank \\
  --no-publish
\`\`\`

This creates a \`./<folder-name>/\` directory and installs npm dependencies into it. \`cd\` in before the next step:

\`\`\`bash
cd <folder-name>
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
