import type { APIRoute } from "astro";

const UPSTREAM_BASE = "https://dev.wix.com/skills/wix-headless";
const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const raw = (params.path ?? "").toString();

  let path = raw;
  if (/^skill$/i.test(raw)) path = "SKILL";

  const upstreamUrl = `${UPSTREAM_BASE}/${path}.md`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "text/plain, text/markdown, */*" },
    });

    if (!upstream.ok) {
      return new Response(`Not found upstream: ${upstreamUrl}\n`, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const body = await upstream.text();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": CACHE_HEADER,
        "X-Source": upstreamUrl,
      },
    });
  } catch (err) {
    return new Response(`Upstream fetch failed: ${err}\n`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
};
