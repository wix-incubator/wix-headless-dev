import { defineMiddleware, sequence } from "astro:middleware";

// Normalize URL casing: agents that paste prompts hand-roll URLs in arbitrary
// case (/Skill.md, /SKILL.MD) and Astro's file-based router is case-sensitive.
// Redirect any path with uppercase to its lowercase form so we behave like a
// case-agnostic file server.
const normalizeCasing = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const lower = url.pathname.toLowerCase();
  if (url.pathname !== lower) {
    return context.redirect(lower + url.search, 301);
  }
  return next();
});

// Inline script injected into every SSR'd HTML page.
const WIX_EMBEDS_SCRIPT =
  "<script>window.wixEmbedsAPI.isWixSite = () => true;</script>";

// Inject the inline script into the rendered HTML. This runs last in the
// middleware chain, so it only acts once all upstream middleware has finished
// and the page has been server-rendered.
const injectWixEmbedsScript = defineMiddleware(async (_context, next) => {
  const response = await next();

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const html = await response.text();
  const injected = html.includes("</body>")
    ? html.replace("</body>", `${WIX_EMBEDS_SCRIPT}</body>`)
    : html + WIX_EMBEDS_SCRIPT;

  // Drop content-length so the runtime recomputes it for the rewritten body.
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});

export const onRequest = sequence(normalizeCasing, injectWixEmbedsScript);
