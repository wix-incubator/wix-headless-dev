import { defineMiddleware } from "astro:middleware";

// Normalize URL casing: agents that paste prompts hand-roll URLs in arbitrary
// case (/Skill.md, /SKILL.MD) and Astro's file-based router is case-sensitive.
// Redirect any path with uppercase to its lowercase form so we behave like a
// case-agnostic file server.
export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const lower = url.pathname.toLowerCase();
  if (url.pathname !== lower) {
    return context.redirect(lower + url.search, 301);
  }
  return next();
});
