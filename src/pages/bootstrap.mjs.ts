import type { APIRoute } from "astro";
// Single source of truth: the real script under scripts/, inlined at build time.
import script from "../../scripts/bootstrap.mjs?raw";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";

export const prerender = false;

// Served at https://wix-headless.dev/bootstrap.mjs — the skill downloads and runs
// this once to do the deterministic first steps (prereq checks, project setup,
// build/release) before the agent goes agentic to connect Business Solutions.
export const GET: APIRoute = () =>
  new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
    },
  });
