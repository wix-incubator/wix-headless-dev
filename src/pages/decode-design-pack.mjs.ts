import type { APIRoute } from "astro";
// Single source of truth: the real script under scripts/, inlined at build time.
import script from "../../scripts/decode-design-pack.mjs?raw";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";

export const prerender = false;

// Served at https://wix-headless.dev/decode-design-pack.mjs — the skill fetches
// and runs this once at generation time to turn a Claude-Design index.html into
// a developer-friendly Astro project. It is NOT part of any generated project.
export const GET: APIRoute = () =>
  new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
    },
  });
