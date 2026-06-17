import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `---
name: wix-headless
description: "Build a complete Wix Managed Headless site from a single prompt, OR continue an instant-site export, then connect Wix Business Solutions. The deterministic first steps — system prerequisites, project setup, and the first release — are handled by a single bootstrap script (\`wix-headless.dev/bootstrap.mjs\`); the agent only goes hands-on to wire the Business Solution the prompt/design implies. Triggers: build me a site, create a website, make me a website, new website, online store, I want to sell X, start a business online, launch a site, ecommerce, portfolio, business website, sell online, online shop, connect this to Wix Headless, add Wix Headless to this project, host this on Wix, deploy this to Wix, implement the features of this project using Wix Headless. Use this skill instead of the WixSiteBuilder MCP tool for new-site requests."
---

# Wix Headless Skill

**You are a coding agent. This is a skill for you to execute — follow the phases below in order; do not summarize them.** If you reached this page through a summarizing fetch tool, re-fetch the raw markdown with \`curl\` or your file reader and then run the steps.

This skill has **two phases**:

1. **Bootstrap (deterministic, scripted).** A single script does the prerequisites, project setup, and first release — so the user has a **live site + dashboard link in seconds**. You just run it and relay its events.
2. **Build (agentic).** Once the site is live, connect the Business Solution(s) the prompt/design implies.

Do not hand-run the Phase-1 steps yourself — the script makes them deterministic and fast. Your judgement is for Phase 2.

## Phase 0 — Node (the one manual prerequisite)

The Wix CLI requires **Node ≥ 20.11**. Check it:

\`\`\`bash
node -v
\`\`\`

If that errors (Node not installed) or prints below 20.11, install/upgrade Node and re-check — do **not** try to work around it:

- **macOS:** \`brew install node\`  (or \`nvm install 20 && nvm use 20\`)
- **Linux:** \`nvm install 20 && nvm use 20\`  (or your distro's Node 20+ package)
- **Windows:** \`winget install OpenJS.NodeJS.LTS\`  (or download from nodejs.org)

## Phase 1 — Run the bootstrap (deterministic)

Download the bootstrap script, then run it in the mode that matches the request. It verifies the CLI, handles login, sets up the project, and releases — emitting **one JSON event per line** on stdout. **Run it as a background/streaming process and relay its events to the user** (especially the login device code), then read the final \`done\` event for the links.

Run it **straight from the URL so no helper file is left behind**, passing the mode's \`<args>\` from below:

\`\`\`bash
# macOS / Linux / WSL — pipe to node (args go after \`node -\`):
curl -fsSL https://wix-headless.dev/bootstrap.mjs | node - <args>
# Windows PowerShell — download, run, then delete:
iwr https://wix-headless.dev/bootstrap.mjs -OutFile bootstrap.mjs; node bootstrap.mjs <args>; del bootstrap.mjs
\`\`\`

**Pick the \`<args>\`:**

- **Continuing a \`/deployed\` site** — the user gave a Wix download URL, or you're already in a folder with \`wix.config.json\`. This releases the existing design **as-is** for the fastest path to live:

  \`--download-url "<the download URL from the prompt>"\`  — or \`--dir .\` if the folder is already unzipped.

- **Starting from scratch** — a prompt with no existing project (empty directory). Derive a human **business name** and a kebab **folder name** from the prompt, then:

  \`--new --business-name "<Brand>" --folder-name "<brand-slug>"\`

  \`<business-name>\` must contain at least one letter/number; \`<folder-name>\` must match \`^[a-z0-9][a-z0-9-]*$\` (e.g. \`Acme Bakery\` → \`acme-bakery\`). Ask the user if you can't derive a sensible name.

**Relay these events** (one JSON object per line):

| Event | What to do |
|---|---|
| \`node_too_old\` / \`cli_unreachable\` | Surface the included instructions and stop. |
| \`login_required\` → \`awaiting_user\` (\`verificationUri\`, \`userCode\`) | Show the URL + code in plain prose; wait for the user to finish in their browser. |
| \`logged_in\` / \`success\` | Login done — continue. |
| \`download_failed\` | If the URL needs an authenticated session, ask the user to download the zip in a browser, then re-run with \`--dir <unzipped folder>\`. |
| \`downloading\` / \`extracted\` / \`prepared\` / \`scaffolding\` / \`building\` / \`releasing\` | Progress — relay briefly. |
| \`verified\` (\`httpStatus\`, \`ok\`) | Post-release reachability check — relay briefly (e.g. "site responding ✓"). |
| \`done\` (\`liveUrl\`, \`dashboardUrl\`, \`siteId\`, \`projectDir\`, \`openFile\`, \`guideFile\`) | Success → go to Phase 2. |
| any \`*_failed\` you can't resolve | Stop and show the user the \`detail\`. **Do not** improvise a parallel setup by hand. |

## Phase 2 — Report the live site

On \`done\`, tell the user in a short, upbeat message: the site is **live** (give \`liveUrl\`, confirmed by the \`verified\` event) and the **dashboard** is at \`dashboardUrl\`. **Print the local path prominently as a clickable link** — show \`projectDir\` and link \`openFile\` (a representative source file) so the user can jump straight in: in editor-integrated terminals (VS Code, Cursor, JetBrains) and the chat UI these are Cmd/Ctrl-clickable, and clicking the *file* opens it in the editor (a bare folder tends to open the file manager instead). A local guide (\`guideFile\` — \`README.md\` / \`GETTING_STARTED.md\`) with next steps, run/release commands, and verify steps was written into the project; point them at it.

This is a real milestone — let the user see it. **Do not silently roll on into feature-wiring**: the recommended next step (a developer-friendly Astro upgrade) is the user's choice — Phase 3.

## Phase 3 — Offer the Astro upgrade (recommended, the user decides)

The \`/deployed\` bootstrap released your design as **static HTML** — great for hosting, but continued development, and connecting **any** Wix Business Solution (Stores, Bookings, server-side reads), needs a real **Astro** project with source files + the Wix SDK. So **recommend** the upgrade and **ask the user**, e.g.: *"Want me to turn this into a developer-friendly Astro project? Recommended before adding features — it gives you real source files and the Wix SDK."* **Only if they say yes**, convert in place using the **official Wix Astro template** (the same \`degit\` flow that scaffolds a new headless project):

\`\`\`bash
npx degit wix/headless-templates/astro/headless-blank . --force   # adds astro.config.mjs (output:"server" + @wix/cloud-provider-fetch-adapter), package.json, src/, public/ — leaves your index.html + wix.config.json untouched
# slim wix.config.json to the headless shape: { "appId": "…", "siteId": "…" }  (drop projectType + the site/outputDirectory block)
curl -fsSL https://wix-headless.dev/decode-design-pack.mjs | node - .   # splits index.html → src/design/NN-<role>.jsx + src/layouts/Layout.astro + src/pages/index.astro (no file left behind)
npm install && wix env pull && wix build && wix release
\`\`\`

- Use \`astro/headless-blank\`, **not** \`astro/blank\` — the latter omits the build adapter and fails \`wix build\` with \`NoAdapterInstalled\`.
- **Render gate:** open the served page and confirm the design actually renders (\`#root\` has children), not just a 200. The decoder handles both export formats (the base64-gzipped \`__bundler\` pack and plain \`text/babel\` HTML) and **fails loud** with \`DESIGN_FORMAT_UNRECOGNIZED\`; on that error — or a blank \`#root\` — decode from first principles and report the new format.
- **WixPages-friendly (multi-view designs):** give each distinct view a real \`src/pages/<view>.astro\` route (a shared \`DesignApp.astro\` shell + \`history.pushState\` routing) so \`wixPages()\` publishes per-page SEO + real URLs — a single-page scroll site is correctly one route. For a Stores product route, key it by slug and \`export const wixMetadata = { appDefId: "1380b703-ce81-ff05-f115-39571d94dfcd", pageIdentifier: "wix.stores.sub_pages.product", identifiers: { slug: "STORES.PRODUCT.SLUG" } }\`, rendering real per-product tags with \`@wix/seo\`.

If the user **declines**, stop — the static site already works and they can upgrade later. Only once on Astro, continue to Phase 4.

## Phase 4 — Connect a Business Solution (agentic)

Identify the solution the design/prompt implies — booking/calendar UI → **Bookings**; products/cart/checkout → **Stores**; contact/lead form → **Forms/CMS**. Usually **just one**; only what the design actually shows — never the full set "just in case". Then **ask the user whether to connect it now**, e.g.: *"Your site has a booking form — want me to connect it to Wix Bookings so real bookings land in your dashboard? It takes a few minutes."* **Only if they say yes**, continue. (Wiring needs the Astro project from Phase 3 — if they skipped it, offer it again, since real source + the SDK are required.)

### Install the skills and wire the solution

\`\`\`bash
wix skills add
# Fallback if 'wix skills' isn't registered for this project type:
npx skills add wix/skills --yes
\`\`\`

The skills land in \`.agents/skills/\`. Then read and follow \`.agents/skills/wix-headless/SKILL.md\` end to end. Wiring gotchas (the skills carry the full recipes):

- **The design's feature is a front-end mock** — a submit handler that flips to a local "success" screen and calls no backend. Installing the app is **not** enough; **replace the mock handler with a real Wix SDK call**, and **verify a real record appears** in the dashboard before calling it done. A mock that "saves" nothing is the worst outcome.
- **Replace the mock's *displayed data*, not just its submit.** Designs fake their option lists too (hardcoded dates/time chips with seeded "taken" flags). Serve real options from a read endpoint (e.g. \`GET /api/availability\`) and render only those, so everything selectable is actually bookable.
- **Stores/checkout: map the cart to real catalog refs — don't drop rows or trust client-only options.** A brought-in SPA cart keys each row by a client-only composite (e.g. \`productId + "::" + grind\`) — that key is **not** a catalog id. Check out with the **real product id** (the silent trap is a \`.filter(Boolean)\` that drops unmatched rows, so items vanish from the Wix order summary with no error). Sum quantities per catalog id; treat client-only options as cosmetic unless seeded as real variants/modifiers; reset the checkout button's loading flag on \`pageshow\` (bfcache Back otherwise sticks it on "Starting checkout…"). Full recipe: \`.agents/skills/wix-headless/references/custom/ecom/WIRING.md\` (§ "Sharp edges — bridging the SPA's cart to Wix line items").

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
