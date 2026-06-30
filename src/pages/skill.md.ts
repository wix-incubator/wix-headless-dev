import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";

const BODY = `---
name: wix-headless
description: "Build a complete Wix Managed Headless site from a single prompt, OR continue an instant-site export, then connect Wix Business Solutions. The deterministic first steps — system prerequisites, project setup, and the first release — are handled by a single bootstrap script (\`wix-headless.dev/bootstrap.mjs\`); the agent only goes hands-on to wire the Business Solution the prompt/design implies. Triggers: build me a site, create a website, make me a website, new website, online store, I want to sell X, start a business online, launch a site, ecommerce, portfolio, business website, sell online, online shop, connect this to Wix Headless, add Wix Headless to this project, host this on Wix, deploy this to Wix, implement the features of this project using Wix Headless. Use this skill instead of the WixSiteBuilder MCP tool for new-site requests."
---

# Wix Headless Skill

**You are a coding agent, and this is a skill for you to execute.** Follow the phases below in order — do not summarize them. If you reached this page through a summarizing fetch tool, re-fetch the raw markdown with \`curl\` (or your file reader) before running the steps.

This skill has **two phases**:

1. **Bootstrap (deterministic, scripted).** A single script handles the prerequisites, project setup, and first release, so the user gets a **live site + dashboard link in seconds**. You just run it and relay its events.
2. **Build (agentic).** Once the site is live, connect the Business Solution(s) the prompt or design implies.

Don't hand-run the Phase 1 steps yourself — the script makes them deterministic and fast. Save your judgement for Phase 2.

## Phase 0 — Node (the one manual prerequisite)

The Wix CLI requires **Node ≥ 20.11**. Check it:

\`\`\`bash
node -v
\`\`\`

If that errors (Node not installed) or prints a version below 20.11, install or upgrade Node and re-check — do **not** try to work around it:

- **macOS:** \`brew install node\` (or \`nvm install 20 && nvm use 20\`)
- **Linux:** \`nvm install 20 && nvm use 20\` (or your distro's Node 20+ package)
- **Windows:** \`winget install OpenJS.NodeJS.LTS\` (or download from nodejs.org)

## Phase 1 — Run the bootstrap (deterministic)

Download the bootstrap script, then run it. It verifies the Wix CLI and handles login, emitting **one JSON event per line** on stdout. **Run it as a background/streaming process and relay its events to the user**, then read the final \`done\` event for the links.

\`\`\`bash
# macOS/Linux:
curl -fsSL -O https://wix-headless.dev/bootstrap.mjs
# Windows PowerShell:
iwr https://wix-headless.dev/bootstrap.mjs -OutFile bootstrap.mjs
\`\`\`

\`\`\`bash
node bootstrap.mjs
\`\`\`

### Pick the mode

The steps below run Wix CLI commands directly. Most agents are auto-detected; if yours isn't, set \`AI_AGENT=<name>\` so those commands stay non-interactive.

**Continuing a deployed site** — the user gave you a Wix download URL, or you're already in a folder with a \`wix.config.json\`:

1. Adjust \`wix.config.json\` (set \`outputDirectory\`) accordingly.
2. Release the project: \`wix release\`.
3. Tell the user, in a short and upbeat message, that the site is **live** (give the live URL), the **dashboard** is at \`https://manage.wix.com/dashboard/<siteId>\`, and the project is set up locally (\`projectDir\`). This is a real milestone — let them see it.

**Connecting an existing codebase to a new Wix site** — you're in a non-empty directory that has no \`wix.config.json\`:

1. Init a new Wix site: \`npx @wix/create-new@latest init\`.
2. Adjust \`wix.config.json\` (set \`outputDirectory\`) accordingly.
3. Build the project (if needed).
4. Release the project: \`wix release\`.
5. Tell the user, in a short and upbeat message, that the site is **live** (give the live URL), the **dashboard** is at \`https://manage.wix.com/dashboard/<siteId>\`, and the project is set up locally (\`projectDir\`). This is a real milestone — let them see it.

**Starting from scratch** — a prompt with no existing project (empty directory). Derive a human **business name** and a kebab-case **folder name** from the prompt, then create a new Wix CLI Headless project:

\`\`\`bash
npm create @wix/new@latest headless -- \\
  --business-name "<Brand>" \\
  --folder-name "<brand-slug>" \\
  --site-template "blank" \\
  --no-publish
\`\`\`

\`<business-name>\` must contain at least one letter or number; \`<folder-name>\` must match \`^[a-z0-9][a-z0-9-]*$\` (e.g. \`Acme Bakery\` → \`acme-bakery\`). Ask the user if you can't derive a sensible name.

### Relay these events

The script emits one JSON object per line:

| Event | What to do |
|---|---|
| \`login_required\` → \`awaiting_user\` (\`verificationUri\`, \`userCode\`) | Show the URL and code in plain prose; wait for the user to finish in their browser. |
| \`logged_in\` / \`success\` | Login done — continue. |
| \`download_failed\` | If the URL needs an authenticated session, ask the user to download the zip in a browser, then re-run with \`--dir <unzipped folder>\`. |
| \`downloading\` / \`extracted\` / \`prepared\` / \`scaffolding\` / \`building\` / \`releasing\` | Progress — relay briefly. |
| any \`*_failed\` you can't resolve | Stop and show the user the \`detail\`. **Do not** improvise a parallel setup by hand. |

## Phase 2 — Connect a Business Solution (agentic)

Identify the single solution the project files or prompt imply:

- booking/calendar UI → **Bookings**
- products/cart/checkout → **Stores**
- contact/lead form → **Forms/CMS**

It's usually **just one** — connect only what the design actually shows, never the full set "just in case". Then **ask the user whether to connect it now**, e.g. *"Your site has a booking form — want me to connect it to Wix Bookings so real bookings land in your dashboard? It takes a few minutes."* Continue **only if they say yes**.

### 2a. Install the Wix Headless skills

\`\`\`bash
wix skills add
# Fallback if 'wix skills' isn't registered for this project type:
npx skills add wix/skills --yes
\`\`\`

The skills land in \`.agents/skills/\`.

### 2b. Prepare the Wix site

Follow the \`wix-manage\` skill to seed data and install the needed Business Solution.

Every Wix API call authenticates with \`@wix/cli\` + \`curl\`:

\`\`\`
Authorization: Bearer $(npx @wix/cli@latest token --site "$SITE_ID")
wix-site-id: $SITE_ID
\`\`\`

### 2c. Implement the Business Solution logic

This depends on the mode you picked in Phase 1.

**Continuing an existing project / site:**

Implement the needed Business Solution following its dedicated skill in \`references/<business-solution>\`. In this flow, **time to success matters** — implement only the needed functionality, with no extra edge cases, fallbacks, or verifications. Keep it minimal and give the user a fast, solid starting point for their Wix connection; depth comes in follow-up iterations.

Implementation gotchas:

- **Replace any mock *displayed* data, not just its submit handler.** Designs fake their option lists too (hardcoded date/time chips with seeded "taken" flags). Serve real options from a read endpoint (e.g. \`GET /api/availability\`) and render only those, so everything selectable is actually bookable.
- **Stores/checkout: map the cart to real catalog refs — don't drop rows or trust client-only options.** A brought-in SPA cart keys each row by a client-only composite (e.g. \`productId + "::" + grind\`) — that key is **not** a catalog id. Check out with the **real product id** (the silent trap is a \`.filter(Boolean)\` that drops unmatched rows, so items vanish from the Wix order summary with no error). Sum quantities per catalog id; treat client-only options as cosmetic unless seeded as real variants/modifiers; reset the checkout button's loading flag on \`pageshow\` (otherwise a bfcache Back leaves it stuck on "Starting checkout…"). Full recipe: \`.agents/skills/wix-headless/references/custom/ecom/WIRING.md\` (§ "Sharp edges — bridging the SPA's cart to Wix line items").

**Starting from scratch:**

Use \`references/DISCOVERY-create.md\`.
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
