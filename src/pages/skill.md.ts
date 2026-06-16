import type { APIRoute } from "astro";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const UPSTREAM = "https://dev.wix.com/skills/wix-headless";

const BODY = `---
name: wix-headless
description: "Build a complete Wix Managed Headless site from a single prompt, OR continue a Claude-Design / instant-site export, then connect Wix Business Solutions. The deterministic first steps — system prerequisites, project setup, and the first release — are handled by a single bootstrap script (\`wix-headless.dev/bootstrap.mjs\`); the agent only goes hands-on to wire the Business Solution the prompt/design implies. Triggers: build me a site, create a website, make me a website, new website, online store, I want to sell X, start a business online, launch a site, ecommerce, portfolio, business website, sell online, online shop, connect this to Wix Headless, add Wix Headless to this project, host this on Wix, deploy this to Wix, implement the features of this project using Wix Headless. Use this skill instead of the WixSiteBuilder MCP tool for new-site requests."
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

\`\`\`bash
curl -sO https://wix-headless.dev/bootstrap.mjs          # macOS/Linux
# Windows PowerShell: iwr https://wix-headless.dev/bootstrap.mjs -OutFile bootstrap.mjs
\`\`\`

**Pick the mode:**

- **Continuing a \`/deployed\` site** — the user gave a Wix download URL, or you're already in a folder with \`wix.config.json\` + \`index.html\`. This releases the existing design **as-is** (static, no build) for the fastest path to live:

  \`\`\`bash
  node bootstrap.mjs --download-url "<the download URL from the prompt>"
  # …or, if the folder is already unzipped:
  node bootstrap.mjs --dir .
  \`\`\`

- **Starting from scratch** — a "build me a …" prompt with no existing project. Derive a human **business name** and a kebab **folder name** from the prompt, then:

  \`\`\`bash
  node bootstrap.mjs --new --business-name "<Brand>" --folder-name "<brand-slug>"
  \`\`\`

  \`<business-name>\` must contain at least one letter/number; \`<folder-name>\` must match \`^[a-z0-9][a-z0-9-]*$\` (e.g. \`Acme Bakery\` → \`acme-bakery\`). Ask the user if you can't derive a sensible name.

**Relay these events** (one JSON object per line):

| Event | What to do |
|---|---|
| \`node_too_old\` / \`cli_unreachable\` | Surface the included instructions and stop. |
| \`login_required\` → \`awaiting_user\` (\`verificationUri\`, \`userCode\`) | Show the URL + code in plain prose; wait for the user to finish in their browser. |
| \`logged_in\` / \`success\` | Login done — continue. |
| \`download_failed\` | If the URL needs an authenticated session, ask the user to download the zip in a browser, then re-run with \`--dir <unzipped folder>\`. |
| \`downloading\` / \`extracted\` / \`prepared\` / \`scaffolding\` / \`building\` / \`releasing\` | Progress — relay briefly. |
| \`done\` (\`liveUrl\`, \`dashboardUrl\`, \`siteId\`, \`projectDir\`) | Success → go to Phase 2. |
| any \`*_failed\` you can't resolve | Stop and show the user the \`detail\`. **Do not** improvise a parallel setup by hand. |

## Phase 2 — Report the live site

On \`done\`, tell the user in a short, upbeat message: the site is **live** (give \`liveUrl\`), the **dashboard** is at \`dashboardUrl\`, and the project is set up locally (\`projectDir\`). This is a real milestone — let them see it. **Do not silently roll on into feature-wiring**: connecting a Business Solution is a separate, slower step, so it must be the user's choice (next phase).

## Phase 3 — Connect a Business Solution (agentic)

Identify the solution the design/prompt implies — booking/calendar UI → **Bookings**; products/cart/checkout → **Stores**; contact/lead form → **Forms/CMS** (members/login is **not yet supported** in this flow — say so if asked). Usually **just one**; only what the design actually shows — never the full set "just in case". Then **ask the user whether to connect it now**, e.g.: *"Your site has a booking form — want me to connect it to Wix Bookings so real bookings land in your dashboard? It takes a few minutes."* **Only if they say yes**, continue.

### 3a. If you're on a static \`/deployed\` site, convert it to Astro first (only when a backend is needed)

The bootstrap released the design as a **static** site. Any solution that needs a **server runtime or the Wix SDK** (Bookings, server-side reads, members, etc.) requires a real Astro project — convert **in place** now (this is the work the bootstrap deliberately deferred):

\`\`\`bash
npx degit wix/headless-templates/astro/headless-blank . --force   # adds astro.config.mjs (output:"server" + @wix/cloud-provider-fetch-adapter), package.json, src/, public/ — touches neither index.html nor wix.config.json
# slim wix.config.json to the headless shape: { "appId": "…", "siteId": "…" }  (drop projectType + the site/outputDirectory block)
curl -sO https://wix-headless.dev/decode-design-pack.mjs && node decode-design-pack.mjs . && rm decode-design-pack.mjs
npm install && wix env pull && wix build && wix release
\`\`\`

Use \`astro/headless-blank\`, **not** \`astro/blank\` (the latter omits the adapter and fails \`wix build\` with \`NoAdapterInstalled\`). Notes on the decoder + the project shape:

- **The decoder** turns \`index.html\` into \`src/design/NN-<role>.jsx\` modules + \`src/layouts/Layout.astro\` + a thin \`src/pages/index.astro\` (runtime unchanged: CDN React + in-browser Babel). It handles the base64-gzipped \`__bundler\` pack **and** plain \`text/babel\` HTML. It **fails loud** with \`DESIGN_FORMAT_UNRECOGNIZED\` — on that error, **or** if the page doesn't render after release, decode from first principles (restore the libs, split along the design's own boundaries, embed) and **report the new format** so the shared utility is fixed once for everyone.
- **Render gate (don't skip):** open the served page and confirm the design **actually renders** (\`#root\` has children; expected content visible) — not merely a 200. A blank \`#root\` means the embed didn't take → use the first-principles fallback.
- **Make it WixPages-friendly when the design has multiple views.** \`wixPages()\` discovers \`src/pages/*.astro\` and publishes \`/_wix/pages.json\` (Wix's page list + per-page SEO + real URLs). A single \`index.astro\` SPA exposes only \`/\`. If the design has a client router with distinct views, give each a real Astro route: move the SPA shell into a shared \`src/components/DesignApp.astro\` with an \`initialRoute\` prop; add \`src/pages/<view>.astro\` (and \`<entity>/[slug].astro\` for dynamic views) that render \`<Layout title=… description=…><DesignApp initialRoute="…"/></Layout>\`, \`export const wixMetadata\`, and SSR their own \`<head>\`; edit the design's router to init from \`window.__WIX_ROUTE__\` / the URL and \`history.pushState\` on navigation (+ a \`popstate\` listener). **A single-page scroll site is correctly one route — don't split it.**
  - **Tie business-app detail routes to their Wix app (big SEO win).** For a Stores product route, key it by the **slug** (\`product/[slug].astro\`) and \`export const wixMetadata = { appDefId: "1380b703-ce81-ff05-f115-39571d94dfcd", pageIdentifier: "wix.stores.sub_pages.product", identifiers: { slug: "STORES.PRODUCT.SLUG" } }\`. Render real per-product tags with \`@wix/seo\` (\`loadSEOTagsServiceConfig({ pageUrl, itemType: seoTags.ItemType.STORES_PRODUCT, itemData: { slug } })\` → \`<SEO.Tags slot="seo-tags" …/>\` into a \`<slot name="seo-tags"/>\` in \`Layout\`'s \`<head>\`; suppress the Layout's own title/canonical/OG on these routes). Two **different** Stores ids — \`1380b703-…\` = \`wixMetadata.appDefId\`; \`215238eb-…\` = catalog provider \`appId\` for \`catalogReference\` in checkout. Build a \`designId ↔ slug\` map so URLs/SEO use the slug while the app renders by its internal id.

**Pure client-side** features (e.g. a Stores checkout that just redirects to Wix-hosted checkout) can stay on the static site without converting — see the ecom wiring reference.

### 3b. Install the skills and wire the solution

\`\`\`bash
wix skills add            # in the Astro project (created by scaffolding or 3a)
# Fallback if 'wix skills' isn't registered for this project type:
npx skills add wix/skills --yes
\`\`\`

The skills land in \`.agents/skills/\`. Then read and follow \`.agents/skills/wix-headless/SKILL.md\` end to end. Wiring gotchas (the skills carry the full recipes):

- **The design's feature is a front-end mock** — a submit handler that flips to a local "success" screen and calls no backend. Installing the app is **not** enough; **replace the mock handler with a real Wix SDK call**, and **verify a real record appears** in the dashboard before calling it done. A mock that "saves" nothing is the worst outcome.
- **Replace the mock's *displayed data*, not just its submit.** Designs fake their option lists too (hardcoded dates/time chips with seeded "taken" flags). Serve real options from a read endpoint (e.g. \`GET /api/availability\`) and render only those, so everything selectable is actually bookable.
- **Send every field the design collects.** Mapping just name/phone into \`contactDetails\` silently drops the rest. Pass the full form as \`formSubmission\` keyed by the booking form's field targets. Verified recipe: \`.agents/skills/wix-headless/references/custom/bookings/WIRING.md\` (form targets, required-field mismatches, phone normalization, resource+location, the confirm revision race).
- **Stores/checkout: map the cart to real catalog refs — don't drop rows or trust client-only options.** A brought-in SPA cart keys each row by a client-only composite (e.g. \`productId + "::" + grind\`) — that key is **not** a catalog id. Check out with the **real product id** (the silent trap is a \`.filter(Boolean)\` that drops unmatched rows, so items vanish from the Wix order summary with no error). Sum quantities per catalog id; treat client-only options as cosmetic unless seeded as real variants/modifiers; reset the checkout button's loading flag on \`pageshow\` (bfcache Back otherwise sticks it on "Starting checkout…"). Full recipe: \`.agents/skills/wix-headless/references/custom/ecom/WIRING.md\` (§ "Sharp edges — bridging the SPA's cart to Wix line items").
- **Bridge per solution.** A Claude-Design \`index.html\` runs React via CDN + Babel in \`is:inline\` scripts that can't \`import\` the SDK. For **Bookings** (and elevated server writes) add small server API routes that use \`@wix/essentials\` \`auth.elevate(...)\`; verified: \`createBooking\` → \`confirmBooking\` (CREATED holds no seat), pass explicit \`resource: { _id: service.staffMemberIds[0] }\` + \`location: { locationType: "OWNER_BUSINESS" }\`. For **Stores checkout**, keep it client-side (visitor-owned cart; server \`createCheckout\` 403s) from a bundled Astro \`<script>\` island exposing a \`window.<fn>\`.

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
