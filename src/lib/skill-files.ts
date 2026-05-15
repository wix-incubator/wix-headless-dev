// Shared loader: inlines every file under skill/wix-headless/ at build time so the
// /skill, /skill.tgz, and /<path>.md/.json routes all read from one source of truth.
// The bundle lives at project root (outside src/) so Vite's dep scanner doesn't try
// to resolve module imports inside the skill templates (.tsx / .astro).

const rawFiles = import.meta.glob(
  "/skill/wix-headless/**/*",
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

export type SkillFile = { path: string; content: string };

export const skillFiles: SkillFile[] = Object.entries(rawFiles)
  .map(([key, content]) => ({
    path: key.replace("/skill/wix-headless/", ""),
    content,
  }))
  .sort((a, b) => a.path.localeCompare(b.path));

export const skillFileMap: ReadonlyMap<string, string> = new Map(
  skillFiles.map((f) => [f.path.toLowerCase(), f.content])
);

export function getSkillFile(path: string): string | undefined {
  return skillFileMap.get(path.toLowerCase());
}
