import type { APIRoute } from "astro";
import { getSkillFile } from "../lib/skill-files";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const raw = (params.path ?? "").toString();

  const candidates: string[] = [`${raw}.md`];
  if (/^skill$/i.test(raw)) candidates.push("SKILL.md");

  for (const candidate of candidates) {
    const content = getSkillFile(candidate);
    if (content) {
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": CACHE_HEADER,
          "X-Source": `skill/wix-headless/${candidate}`,
        },
      });
    }
  }

  return new Response(`Not found: ${raw}.md\n`, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
