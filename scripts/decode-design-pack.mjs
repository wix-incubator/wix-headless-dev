#!/usr/bin/env node
// decode-design-pack.mjs — turn a Claude-Design `index.html` into a
// developer-friendly Astro project. Handles both export formats:
//   • bundler pack  — base64-gzipped resources in <script type="__bundler/*"> blocks
//   • plain HTML    — a self-contained page with inline <script type="text/babel"> blocks
// Output: src/design/NN-<role>.jsx (one per module), src/layouts/Layout.astro,
//         public/fonts/* (pack only), and a thin src/pages/index.astro.
// The design's runtime is preserved (CDN React + in-browser Babel); this only
// re-organizes source. Run once at generation time, then discard — it is NOT
// part of the generated project.
//
// Usage:  node decode-design-pack.mjs [projectDir]   (default ".")
import fs from "fs";
import zlib from "zlib";
import path from "path";

const proj = process.argv[2] || ".";
const html = fs.readFileSync(path.join(proj, "index.html"), "utf8");
const S_END = "</" + "script>";

const slug = (t) =>
  t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 3).join("-");

// Name each module by ROLE. High-confidence definitional signals win over the
// heading heuristic (which can false-match an internal label); the heading is a
// real "<Brand> — <Section>" em/en-dash title, never a bare "// -- comment".
const slugFor = (src, i) => {
  // 1) definitional signals (a module that *defines* a reusable thing)
  if (/tweaks-panel\.jsx|function\s+(useTweaks|TweaksPanel)\b/.test(src)) return "tweaks-panel";
  if (/const products\s*=\s*\[/.test(src)) return "data-model";
  if (/function\s+BookingModal\b/.test(src)) return "booking";
  if (/function\s+App\b/.test(src) && /createRoot|ReactDOM\.render/.test(src)) return "app-shell";
  // 2) a real "<Brand> — <Section>" heading at the TOP of the module. Require a
  //    MULTI-WORD brand on the left (e.g. "MAD Coffee House — Home page") so a
  //    single-word component note ("Sprig — stem with paired leaves") doesn't win.
  const m = src.slice(0, 300).match(/[A-Z][A-Za-z'’]+(?:\s+[A-Za-z][A-Za-z'’]+){1,4}\s+[—–]\s+([A-Za-z][^\n*]{2,40})/);
  if (m) return slug(m[1]);
  // 3) structural fallbacks by dominant components
  if (/function\s+(Nav|Hero|Header|Footer|Section|Services|About|Shop|Product|Origins)\w*/.test(src)) return "sections";
  if (/function\s+(Icon|Leaf|Sprig|Branch|Wave)\w*/.test(src)) return "primitives";
  return `module-${i + 1}`;
};

const isPack = html.includes('<script type="__bundler/manifest">');
let template, fonts = 0;
const appModules = [];

if (isPack) {
  // ── bundler pack: decode template + manifest ───────────────────────────────
  const block = (t) => { const m = html.indexOf(`<script type="__bundler/${t}">`); const s = html.indexOf(">", m) + 1; return html.slice(s, html.indexOf(S_END, s)); };
  const manifest = JSON.parse(block("manifest"));
  template = JSON.parse(block("template"));
  const bytes = (id) => { const r = manifest[id]; let b = Buffer.from(r.data, "base64"); if (r.compressed) b = zlib.gunzipSync(b); return b; };

  let reactVer = "18.3.1";
  for (const id in manifest) { if (manifest[id].mime !== "text/javascript") continue; const s = bytes(id).toString("utf8"); if (/react\.development\.js/.test(s.slice(0, 200))) { const mm = s.match(/exports\.version\s*=\s*["']([\d.]+)["']/); if (mm) reactVer = mm[1]; } }
  const CDN = {
    react: `<script src="https://unpkg.com/react@${reactVer}/umd/react.development.js" crossorigin>${S_END}`,
    "react-dom": `<script src="https://unpkg.com/react-dom@${reactVer}/umd/react-dom.development.js" crossorigin>${S_END}`,
    babel: `<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin>${S_END}`,
  };
  const classify = (id) => { const r = manifest[id]; if (r.mime.startsWith("font")) return { kind: "font" }; const h = bytes(id).toString("utf8").slice(0, 200); if (/react-dom\.(development|production)/.test(h)) return { kind: "cdn", lib: "react-dom" }; if (/react\.(development|production)/.test(h)) return { kind: "cdn", lib: "react" }; if (r.mime === "text/javascript") return { kind: "cdn", lib: "babel" }; return { kind: "app" }; };

  // restore CDN libs; collect app modules; mark the first app slot for the bundle.
  // Pack modules share top-level `const`s, so they MUST compile as one unit.
  template = template.replace(/<script([^>]*?)\ssrc="([0-9a-f-]{36})"([^>]*)><\/script>/g, (m, pre, id) => {
    const c = classify(id);
    if (c.kind === "cdn") return CDN[c.lib];
    const src = bytes(id).toString("utf8");
    if (src.includes(S_END)) throw new Error("script-end token in resource " + id);
    appModules.push(src);
    return appModules.length === 1 ? "__SLOT_BUNDLE__" : "";
  });

  fs.mkdirSync(path.join(proj, "public/fonts"), { recursive: true });
  template = template.replace(/url\((['"]?)([0-9a-f-]{36})\1\)/g, (m, q, id) => { if (!manifest[id]) return m; fs.writeFileSync(path.join(proj, "public/fonts", id + ".woff2"), bytes(id)); fonts++; return `url(/fonts/${id}.woff2)`; });
} else {
  // ── plain HTML: extract each <script type="text/babel"> block as a module ───
  // These typically share scope via global `function` declarations and run as
  // separate scripts, so keep them separate (one injected script per module).
  template = html;
  let k = 0;
  template = template.replace(/<script\b[^>]*type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g, (m, body) => { appModules.push(body.replace(/^\n+|\n+$/g, "")); return `__SLOT_${k++}__`; });
}

if (!appModules.length) throw new Error("no app modules found (no __bundler pack and no <script type=\"text/babel\"> blocks)");

// write each module to src/design/NN-<role>.jsx
const designDir = path.join(proj, "src/design");
fs.rmSync(designDir, { recursive: true, force: true });
fs.mkdirSync(designDir, { recursive: true });
const files = appModules.map((src, i) => { const name = `${String(i + 1).padStart(2, "0")}-${slugFor(src, i)}.jsx`; fs.writeFileSync(path.join(designDir, name), src + "\n"); return name; });

// split head/body; mark real top-level <style>/<script> is:inline (placeholders
// are plain text, so the app's JS/JSX is never touched by this regex).
const inlineTags = (s) => s.replace(/<style(\s|>)/g, "<style is:inline$1").replace(/<script(\s|>)/g, "<script is:inline$1");
const headInner = inlineTags(template.slice(template.indexOf("<head>") + 6, template.indexOf("</head>")));
const bodyOpen = template.match(/<body[^>]*>/)[0];
let bodyInner = inlineTags(template.slice(template.indexOf(bodyOpen) + bodyOpen.length, template.indexOf("</body>")));
const htmlTag = (template.match(/<html[^>]*>/) || ['<html lang="en">'])[0];

// inject the modules. Pack → one combined bundle; plain → one script per module.
if (isPack) {
  bodyInner = bodyInner.replace("__SLOT_BUNDLE__", `<script type="text/babel" is:inline set:html={appBundle}></script>`);
} else {
  files.forEach((_, i) => { bodyInner = bodyInner.replace(`__SLOT_${i}__`, `<script type="text/babel" is:inline set:html={m${i}}></script>`); });
}

fs.writeFileSync(path.join(proj, "src/layouts/Layout.astro"),
  `---\n---\n<!doctype html>\n${htmlTag}\n<head>\n<meta name="generator" content={Astro.generator} />\n<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n${headInner}\n</head>\n<body>\n<slot />\n</body>\n</html>\n`);

const imports = files.map((f, i) => `import m${i} from "../design/${f}?raw";`).join("\n");
const bundleLine = isPack ? `const appBundle = [${files.map((_, i) => `m${i}`).join(", ")}].join("\\n;\\n");\n` : "";
fs.writeFileSync(path.join(proj, "src/pages/index.astro"),
  `---\nimport Layout from "../layouts/Layout.astro";\n${imports}\n${bundleLine}---\n<Layout>\n${bodyInner}\n</Layout>\n`);

console.log(JSON.stringify({ format: isPack ? "bundler-pack" : "plain-html", modules: files.length, files, fonts }));
