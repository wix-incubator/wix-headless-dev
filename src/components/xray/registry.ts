export type MetaEntry = {
  id: string;
  capability: string;
  title: string;
  summary: string;
  code: string;
  codeLang: string;
  codePath?: string;
  githubUrl: string;
  docsUrl: string;
};

const REPO = "https://github.com/wix-incubator/wix-headless-dev/blob/main";

export const registry: Record<string, MetaEntry> = {
  "copy-button": {
    id: "copy-button",
    capability: "Wix Analytics",
    title: "The Copy button",
    summary:
      "When you hit Copy, a tracked event lands in your Wix dashboard. No analytics SDK to wire up — it's already in your Wix SDK.",
    code: `import { analytics } from "@wix/site";

const handleCopy = async () => {
  await navigator.clipboard.writeText(copyText);
  analytics.buttonClicked();
};`,
    codeLang: "tsx",
    codePath: "src/components/TryPrompt.tsx",
    githubUrl: `${REPO}/src/components/TryPrompt.tsx`,
    docsUrl: "https://dev.wix.com/docs/go-headless",
  },
  "page-shell": {
    id: "page-shell",
    capability: "Astro · Wix CLI · Wix Hosting",
    title: "This entire page",
    summary:
      "Server-rendered by Astro, built and deployed by the Wix CLI, served from Wix's global CDN with SSL and auto-scaling. No infra to wire up.",
    code: `# Local dev
wix dev

# Ship to production
wix release`,
    codeLang: "bash",
    codePath: "wix.config.json",
    githubUrl: `${REPO}`,
    docsUrl:
      "https://dev.wix.com/docs/go-headless/develop-your-project/wix-managed-headless/about-wix-managed-headless",
  },
  "skill-route": {
    id: "skill-route",
    capability: "Astro API endpoint",
    title: "The /skill route",
    summary:
      "An on-demand Astro API route. Fetches the canonical Wix Headless skill markdown from Wix's docs CDN and serves it cached at the edge.",
    code: `export const GET: APIRoute = async ({ params }) => {
  const upstream = await fetch(
    \`https://dev.wix.com/skills/wix-headless/\${path}.md\`
  );
  return new Response(await upstream.text(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};`,
    codeLang: "ts",
    codePath: "src/pages/[...path].md.ts",
    githubUrl: `${REPO}/src/pages/%5B...path%5D.md.ts`,
    docsUrl: "https://docs.astro.build/en/guides/endpoints/",
  },
  "blog-feed": {
    id: "blog-feed",
    capability: "Wix Blogs",
    title: "The /blog feed",
    summary:
      "Posts are authored in the Wix dashboard and fetched server-side via the @wix/blog SDK. The post body is Wix's rich content, rendered by Ricos. Likes and view metrics come from the same API.",
    code: `import { posts } from "@wix/blog";

const { posts: postList } = await posts.listPosts({
  fieldsets: ["URL", "METRICS"],
  paging: { limit: 24 },
});`,
    codeLang: "ts",
    codePath: "src/pages/blog/index.astro",
    githubUrl: `${REPO}/src/pages/blog/index.astro`,
    docsUrl: "https://dev.wix.com/docs/sdk/backend-modules/blog/introduction",
  },
};

export const entryLabel = (id: string) => registry[id]?.capability ?? id;
