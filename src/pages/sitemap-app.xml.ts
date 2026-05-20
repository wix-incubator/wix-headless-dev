import type { APIRoute } from "astro";
import { posts } from "@wix/blog";

const HOST = "https://www.wix-headless.dev";

const STATIC_PATHS = ["/", "/blog", "/skill.md", "/skill.tgz"];

type Entry = { loc: string; lastmod?: string };

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toDate = (d: Date | string | undefined): string | undefined => {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

const renderUrl = ({ loc, lastmod }: Entry) =>
  `  <url>\n    <loc>${xmlEscape(loc)}</loc>${
    lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
  }\n  </url>`;

export const prerender = false;

export const GET: APIRoute = async () => {
  const entries: Entry[] = STATIC_PATHS.map((p) => ({ loc: HOST + p }));

  try {
    const res = await posts.listPosts({
      fieldsets: ["URL"],
      paging: { limit: 100 },
    });
    for (const post of res.posts ?? []) {
      if (!post.slug) continue;
      entries.push({
        loc: `${HOST}/blog/${post.slug}`,
        lastmod: toDate(
          (post as { lastPublishedDate?: Date | string }).lastPublishedDate ??
            post.firstPublishedDate,
        ),
      });
    }
  } catch {
    // If the blog API is down, still serve the static-pages sitemap rather than 5xx.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderUrl).join("\n")}
</urlset>
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
  });
};
