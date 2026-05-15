import type { APIRoute } from "astro";
import { skillFiles, getSkillFile } from "../lib/skill-files";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const HOST = "https://wix-headless.dev";

const skillMd = getSkillFile("SKILL.md");
if (!skillMd) {
  throw new Error("SKILL.md missing from skill/wix-headless/");
}

const fetchableExtensions = new Set([".md", ".json"]);

function isFetchable(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return fetchableExtensions.has(path.slice(dot));
}

function renderManifest(): string {
  const groups = new Map<string, string[]>();
  for (const { path } of skillFiles) {
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "(root)";
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(path);
  }
  const out: string[] = [];
  for (const [dir, paths] of [...groups.entries()].sort()) {
    out.push(`### \`${dir}\``);
    out.push("");
    for (const p of paths.sort()) {
      out.push(isFetchable(p) ? `- \`${p}\` — ${HOST}/${p}` : `- \`${p}\` — (bundle-only; install via tarball)`);
    }
    out.push("");
  }
  return out.join("\n");
}

const BODY = `# Wix Headless Skill — agent entry point

> You are an AI coding agent that fetched <${HOST}/skill>. The user wants you to build a website using Wix Headless. Everything below is for **you**, not the human. Read it end to end before acting.

## What this is

A coordinated skill that turns a single "build me a site" prompt into a real Wix-backed site: commerce, bookings, CMS, identity, hosted runtime. The bundle is **${skillFiles.length} files** — one orchestrator (\`SKILL.md\`), per-vertical instruction packs, deterministic scripts, code templates, and shared utilities.

## Pick your execution mode

You have two ways to operate the skill. Use **Mode A** unless your runtime cannot run shell commands.

### Mode A — Install the bundle (preferred)

Run this once. It downloads the full skill (markdown + scripts + templates) to a local directory and gives you a stable filesystem layout to work from.

\`\`\`bash
SKILL_ROOT="$HOME/.claude/skills/wix-headless"
mkdir -p "$SKILL_ROOT"
curl -fsSL ${HOST}/skill.tgz | tar -xzf - -C "$SKILL_ROOT" --strip-components=1
\`\`\`

Then:

1. Read \`$SKILL_ROOT/SKILL.md\` and follow it.
2. Every \`<SKILL_ROOT>/...\` path inside that document resolves under \`$SKILL_ROOT\`.
3. Scripts under \`$SKILL_ROOT/scripts/\` run via \`bash\` / \`node\` (no exec bit required).
4. Templates under \`$SKILL_ROOT/templates/\` and utilities under \`$SKILL_ROOT/shared-utilities/\` are read by Phase 3/4 subagents and the \`seed-utilities.sh\` script respectively.

If your runtime has a native skills directory (Claude Code uses \`~/.claude/skills/\`), placing the bundle there registers the skill for future sessions too.

### Mode B — Read inline + fetch on demand (fallback)

If you cannot shell out (sandboxed runtime, single-turn agent), use the inline SKILL.md below. **Path-rewrite rule**: wherever SKILL.md references \`<SKILL_ROOT>/<path>\`, fetch \`${HOST}/<path>\` instead. Markdown and JSON references are served directly via that URL pattern. Shell scripts (\`scripts/\`) and code templates (\`templates/\`, \`shared-utilities/\`) are **not** served as individual URLs — if the workflow needs to invoke a script or copy a template, install the bundle first (Mode A).

The full reference manifest is at the bottom of this response.

## Self-check before acting

Before you start the workflow, confirm:

- \`Mode A\`: \`$SKILL_ROOT/SKILL.md\` exists and you can \`ls $SKILL_ROOT/references/\`. If yes, ignore the inline copy below and follow the on-disk SKILL.md.
- \`Mode B\`: you have the SKILL.md content from this response in your working context. When SKILL.md tells you to read a path under \`<SKILL_ROOT>\`, fetch the URL form instead.

If the user's prompt was just "build X using ${HOST.replace(/^https?:\/\//, "")}" or similar and you have no Wix MCP server connected, stop and tell them: the skill's first wave needs the Wix MCP server. They can run \`npx @wix/cli mcp install\` (or follow their agent's MCP setup) and retry.

---

## Inline SKILL.md

The verbatim contents of \`SKILL.md\` follow. Once you've installed (Mode A) or oriented yourself (Mode B), this is the authoritative playbook. Everything outside the \`BEGIN/END\` markers is wrapper added by this endpoint.

<!-- BEGIN SKILL.md -->

${skillMd}

<!-- END SKILL.md -->

---

## Reference manifest

Every file in the bundle. Markdown and JSON entries link to their canonical fetch URL (Mode B). Other entries are bundle-only — install via tarball (Mode A) to access them.

${renderManifest()}

## Tarball

Mode A downloads <${HOST}/skill.tgz>. The tarball is generated on demand from the same source files this response is composed from — there is no version skew between the inline content above and the on-disk install.

## Pitfalls to skip

- **Don't pre-read subagent \`INSTRUCTIONS.md\` files.** SKILL.md is explicit: pass their absolute path into each subagent dispatch and let the subagent open the file. Pre-reading wastes ~25k tokens and pushes the orchestrator past its autocompact threshold mid-pipeline.
- **Don't also call the \`WixSiteBuilder\` MCP tool.** This skill and \`WixSiteBuilder\` cover the same intent but follow different flows; running both produces a duplicated, conflicting build.
- **Don't invent file modes.** All files ship with mode \`0644\`. Scripts run via \`bash <path>\` / \`node <path>\`, not as direct executables.
- **Don't fabricate URLs.** \`SKILL.md\` § "URL discipline" applies to your final message: only emit URLs that came verbatim from tool output or config.
`;

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
      "X-Skill-Files": String(skillFiles.length),
    },
  });
