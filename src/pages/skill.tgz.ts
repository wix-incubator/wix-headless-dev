import type { APIRoute } from "astro";
import { captureServerEvent } from "../lib/posthog-server";

const UPSTREAM = "https://dev.wix.com/skills/wix-headless.tgz";
const CACHE_DEFAULT = "public, s-maxage=600, stale-while-revalidate=86400";
// Funnel path: cached bytes ship instantly, revalidation in the background
// runs the handler so PostHog gets an event on every hit.
const CACHE_FUNNEL = "public, max-age=0, stale-while-revalidate=600";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request }) => {
  const isFunnel = url.searchParams.get("funnel") === "1";
  if (isFunnel) {
    const distinctId = cookies.get("bSession")?.value || "anonymous";
    void captureServerEvent({
      event: "funnel_skill_fetched",
      distinctId,
      properties: {
        route: "skill.tgz",
        ua: request.headers.get("user-agent") || undefined,
      },
    });
  }
  try {
    const upstream = await fetch(UPSTREAM);

    if (!upstream.ok) {
      return new Response(`Upstream ${upstream.status}: ${UPSTREAM}\n`, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": 'attachment; filename="wix-headless.tgz"',
        "Cache-Control": isFunnel ? CACHE_FUNNEL : CACHE_DEFAULT,
        "X-Source": UPSTREAM,
      },
    });
  } catch (err) {
    return new Response(`Upstream fetch failed: ${err}\n`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
};
