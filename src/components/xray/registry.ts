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
    title: "The /skill.md route",
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
  "wix-cli": {
    id: "wix-cli",
    capability: "Wix CLI",
    title: "Bootstrap with one command",
    summary:
      "The Wix CLI scaffolds a full Wix Managed Headless project — auth, hosting, dashboard, and an Astro app — before you write a line of code. `wix dev` runs locally, `wix release` ships to production.",
    code: `npm create @wix/new@latest headless

# then:
cd headless
wix dev`,
    codeLang: "bash",
    githubUrl: "https://github.com/wix/cli",
    docsUrl: "https://dev.wix.com/docs/go-headless/develop-your-project/wix-cli",
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
  "book-engineer": {
    id: "book-engineer",
    capability: "Wix Bookings",
    title: "Talk to an engineer",
    summary:
      "Slots are fetched server-side at page render so the modal opens with availability already in hand. Each slot lists every staff member free at that time. Clicking Confirm calls createBooking from the browser as an anonymous visitor.",
    code: `import { services, availabilityTimeSlots, bookings } from "@wix/bookings";

const { items: [service] } = await services
  .queryServices().eq("hidden", false).limit(1).find();

const { timeSlots } = await availabilityTimeSlots.listAvailabilityTimeSlots({
  serviceId: service._id,
  fromLocalDate, toLocalDate,
  bookable: true,
  includeResourceTypeIds: [service.primaryResourceType],
});

await bookings.createBooking({
  bookedEntity: { slot: { ...slot, resource: { _id: staffId } } },
  contactDetails: { firstName, lastName, email },
  totalParticipants: 1,
});`,
    codeLang: "ts",
    codePath: "src/components/BookEngineer.tsx",
    githubUrl: `${REPO}/src/components/BookEngineer.tsx`,
    docsUrl: "https://dev.wix.com/docs/sdk/backend-modules/bookings/introduction",
  },
};

export const entryLabel = (id: string) => registry[id]?.capability ?? id;
