import type { APIRoute } from "astro";
import { captureServerEvent } from "../lib/posthog-server";

const CACHE_DEFAULT = "public, s-maxage=600, stale-while-revalidate=86400";
// Funnel path: cached bytes ship instantly, revalidation in the background
// runs the handler so PostHog gets an event on every hit.
const CACHE_FUNNEL = "public, max-age=0, stale-while-revalidate=600";
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

## Browse without installing

The skill is hosted at <${UPSTREAM}/>. Start with [\`SKILL.md\`](${UPSTREAM}/SKILL.md) and follow its references (each \`<SKILL_ROOT>/<path>\` resolves to \`${UPSTREAM}/<path>\`).
`;

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, request }) => {
  const isFunnel = url.searchParams.get("funnel") === "1";
  if (isFunnel) {
    const distinctId = cookies.get("bSession")?.value || "anonymous";
    void captureServerEvent({
      event: "funnel_skill_fetched",
      distinctId,
      properties: {
        route: "skill.md",
        ua: request.headers.get("user-agent") || undefined,
      },
    });
  }
  return new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": isFunnel ? CACHE_FUNNEL : CACHE_DEFAULT,
    },
  });
};
