import type { APIRoute } from "astro";

const UPSTREAM = "https://dev.wix.com/skills/wix-headless.tgz";
const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";

export const prerender = false;

export const GET: APIRoute = async () => {
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
        "Cache-Control": CACHE_HEADER,
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
