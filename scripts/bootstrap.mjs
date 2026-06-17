#!/usr/bin/env node
// bootstrap.mjs — the deterministic first steps of the Wix Headless flow, so the
// agent doesn't have to run them one prose-command at a time. Cross-platform
// (macOS / Linux / Windows). Emits one JSON event per line on stdout; the calling
// agent relays those to the user (especially the login device-code) and reads the
// final `done` event for the live + dashboard links. Then the agent goes "agentic"
// to connect Business Solutions.
//
// Two modes:
//   • continue (default): a /deployed download — a `wix.config.json` (projectType
//     "Site") + a self-contained `index.html`. We make it releasable and release
//     the static HTML AS-IS (no build, no Astro) — fastest path to a live URL.
//     The Astro conversion is deferred to the wiring phase, when a backend is needed.
//       node bootstrap.mjs --download-url <zipUrl>     # fetch+unzip then release
//       node bootstrap.mjs --dir <folder>              # folder already unzipped
//   • new:  node bootstrap.mjs --new --business-name "Acme Bakery" --folder-name acme-bakery
//     Scaffolds a fresh headless Astro project, builds, releases.
//
// What it intentionally does NOT do (left to the agent — not deterministic):
//   - install Node (detect + instruct only), derive a brand name from a prompt,
//     decode/convert the design to Astro, or wire any Business Solution.

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import readline from "node:readline";

const NODE_MIN = [20, 11, 0];

// ── tiny event protocol (one JSON object per line) ───────────────────────────
const emit = (event, extra = {}) => process.stdout.write(JSON.stringify({ event, ...extra }) + "\n");
const fail = (event, extra = {}) => { emit(event, { ok: false, ...extra }); process.exit(1); };

// ── platform-safe binary names (npm/npx are .cmd on Windows) ─────────────────
const isWin = process.platform === "win32";
const bin = (name) => (isWin ? `${name}.cmd` : name);
const WIX = [bin("npx"), "-y", "@wix/cli@latest"]; // run the CLI via npx — no global install/mutation

// run a command, capture stdout+stderr (combined), return {status, out}
function capture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: false, ...opts });
  return { status: r.status ?? 1, out: `${r.stdout || ""}${r.stderr || ""}`, error: r.error };
}

// ── arg parsing (--key value | --flag) ───────────────────────────────────────
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { a[key] = next; i++; } else { a[key] = true; }
  }
  return a;
}

// ── 1. Node version gate (detect + instruct, never mutate) ───────────────────
function checkNode() {
  const cur = process.versions.node.split(".").map(Number);
  const ok = cur[0] > NODE_MIN[0] || (cur[0] === NODE_MIN[0] && cur[1] >= NODE_MIN[1]);
  if (!ok) {
    fail("node_too_old", {
      found: process.versions.node,
      required: NODE_MIN.join("."),
      instructions: {
        macos: "brew install node  (or: nvm install 20 && nvm use 20)",
        linux: "nvm install 20 && nvm use 20   (or your distro's node 20+ package)",
        windows: "winget install OpenJS.NodeJS.LTS   (or download from nodejs.org)",
      },
    });
  }
  emit("node_ok", { version: process.versions.node });
}

// ── 2. CLI reachable (via npx — no install) ──────────────────────────────────
function checkCli() {
  const r = capture(WIX[0], [...WIX.slice(1), "--version"]);
  if (r.status !== 0) fail("cli_unreachable", { detail: r.out.trim().slice(0, 400) });
  emit("cli_ok", { version: r.out.trim().split("\n").pop() });
}

// ── 3. Login (human-in-the-loop device code; forward the CLI's own events) ───
function whoami() {
  const r = capture(WIX[0], [...WIX.slice(1), "whoami"]);
  const m = r.out.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return r.status === 0 && m ? m[0] : null;
}
function login() {
  return new Promise((resolve) => {
    const existing = whoami();
    if (existing) { emit("logged_in", { email: existing }); return resolve(); }
    emit("login_required");
    const child = spawn(WIX[0], [...WIX.slice(1), "login"], { shell: false });
    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      // The CLI emits {event:"awaiting_user"|"success"|"logged_in", ...} in agent
      // mode — pass those straight through so the agent can relay the device code.
      try {
        const ev = JSON.parse(t);
        if (ev && ev.event) { process.stdout.write(t + "\n"); if (ev.event === "success" || ev.event === "logged_in") { resolve(); } return; }
      } catch { /* non-JSON CLI chatter — ignore */ }
    });
    child.on("close", () => resolve()); // resolve on exit too; a later step re-checks auth
    child.on("error", (e) => fail("login_failed", { detail: String(e) }));
  });
}

// ── helpers for both modes ───────────────────────────────────────────────────
function readConfig(dir) {
  const p = path.join(dir, "wix.config.json");
  if (!fs.existsSync(p)) return null;
  try { return { path: p, json: JSON.parse(fs.readFileSync(p, "utf8")) }; } catch { return null; }
}
function release(cwd) {
  emit("releasing");
  const r = capture(WIX[0], [...WIX.slice(1), "release"], { cwd });
  if (r.status !== 0) fail("release_failed", { detail: r.out.trim().slice(-600) });
  const m = r.out.match(/published on\s+(https?:\/\/\S+)/i);
  return m ? m[1].trim() : null;
}
const dashboardUrl = (siteId) => (siteId ? `https://manage.wix.com/dashboard/${siteId}` : null);

// Post-release reachability check, so the agent + the generated guide can report
// deploy status without low-level HTML inspection.
function verify(liveUrl) {
  if (!liveUrl) return Promise.resolve({ ok: false, httpStatus: 0 });
  return fetch(liveUrl, { redirect: "follow" })
    .then((res) => ({ ok: res.status >= 200 && res.status < 400, httpStatus: res.status }))
    .catch(() => ({ ok: false, httpStatus: 0 }));
}

// Leave the project self-documenting: next steps, run/release commands, a verify
// command, and a cleanup note. Writes README.md when absent (the static /deployed
// export has none); else GETTING_STARTED.md so a scaffold's own README isn't clobbered.
function writeGuide(projectDir, info) {
  const { mode, liveUrl, dashboardUrl: dash, siteId, outputDirectory } = info;
  const isContinue = mode === "continue";
  const fence = "```";
  const L = [
    "# " + path.basename(projectDir) + " — Wix Headless",
    "",
    "- **Live site:** " + (liveUrl || "(not released)"),
    "- **Dashboard:** " + (dash || "(n/a)"),
    "- **Site id:** " + (siteId || "(n/a)"),
    "",
    "## What this is",
    "",
    isContinue
      ? "A **static release** of your design — a single `index.html` served from `" + (outputDirectory || "./dist") + "`. No source or build step yet."
      : "A **Wix Headless Astro** project — real source under `src/`, built with the Wix CLI.",
    "",
    "## Run & release locally",
    "",
    fence + "bash",
  ];
  if (isContinue) L.push("npx wix release        # re-publish the static site");
  else L.push("npm install", "npx wix dev            # local dev server", "npx wix build && npx wix release");
  L.push(
    fence,
    "",
    "## Recommended next step",
    "",
    isContinue
      ? "Upgrade to an **Astro project** before adding features — it gives you real source files + the Wix SDK, which connecting Wix Stores / Bookings requires. Ask your agent to \"convert this to an Astro project\" (or see https://wix-headless.dev/skill.md, Phase 3a)."
      : "Connect the Wix Business Solution your design needs (Stores, Bookings, …) — ask your agent, or see https://wix-headless.dev/skill.md, Phase 3.",
    "",
    "## Verify the deployment",
    "",
    fence + "bash",
    "curl -I " + (liveUrl || "<live-url>") + "     # expect HTTP 200",
    fence,
    "",
    "Check app install + catalog/products in the dashboard: " + (dash || "(n/a)"),
    "",
    "## Notes",
    "",
    "- Setup ran without leaving a helper script behind — nothing to clean up.",
    "- This guide was generated by the Wix Headless bootstrap; edit or delete freely.",
  );
  const target = fs.existsSync(path.join(projectDir, "README.md"))
    ? path.join(projectDir, "GETTING_STARTED.md")
    : path.join(projectDir, "README.md");
  fs.writeFileSync(target, L.join("\n") + "\n");
  return target;
}

// ── path-a: continue from a /deployed download → release static HTML as-is ───
async function modeContinue(args) {
  const dir = path.resolve(args.dir || ".");
  fs.mkdirSync(dir, { recursive: true });

  if (args["download-url"]) {
    emit("downloading", { url: args["download-url"] });
    const res = await fetch(args["download-url"]);
    if (!res.ok) fail("download_failed", { status: res.status, hint: "If 401/403, the URL may need an authenticated session — download the zip in a browser and re-run with --dir <unzipped folder>." });
    const zip = path.join(dir, "__download.zip");
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    // tar extracts .zip on Windows 10+/macOS/Linux — no extra dependency.
    const ex = capture("tar", ["-xf", zip, "-C", dir]);
    if (ex.status !== 0) fail("extract_failed", { detail: ex.out.trim().slice(0, 400) });
    fs.rmSync(zip, { force: true });
    emit("extracted", { dir });
  }

  const cfg = readConfig(dir);
  if (!cfg) fail("no_config", { dir, hint: "Expected a wix.config.json from the /deployed download." });
  const siteId = cfg.json.siteId;
  if (!siteId) fail("no_site_id", { detail: "wix.config.json has no siteId — cannot bind to the existing site." });

  // Make it releasable AS A STATIC SITE: keep projectType "Site", point
  // outputDirectory at a folder, and ensure index.html lives inside it.
  const outDir = (cfg.json.site && cfg.json.site.outputDirectory) || "./dist";
  cfg.json.projectType = cfg.json.projectType || "Site";
  cfg.json.site = { ...(cfg.json.site || {}), outputDirectory: outDir };
  fs.writeFileSync(cfg.path, JSON.stringify(cfg.json, null, 2) + "\n");

  const absOut = path.resolve(dir, outDir);
  fs.mkdirSync(absOut, { recursive: true });
  const rootIndex = path.join(dir, "index.html");
  const outIndex = path.join(absOut, "index.html");
  if (fs.existsSync(rootIndex) && !fs.existsSync(outIndex)) {
    fs.renameSync(rootIndex, outIndex);
  }
  if (!fs.existsSync(outIndex)) fail("no_index_html", { outputDirectory: outDir, hint: "No index.html in the output directory to publish." });
  emit("prepared", { dir, outputDirectory: outDir });

  await login();
  const liveUrl = release(dir);
  const health = await verify(liveUrl);
  emit("verified", { liveUrl, httpStatus: health.httpStatus, ok: health.ok });
  const guideFile = writeGuide(dir, { mode: "continue", liveUrl, dashboardUrl: dashboardUrl(siteId), siteId, outputDirectory: outDir });
  // openFile: a representative file so a Cmd/Ctrl+click lands the user in their
  // editor (clicking a folder tends to open the file manager instead).
  emit("done", { mode: "continue", liveUrl, dashboardUrl: dashboardUrl(siteId), siteId, projectDir: dir, openFile: outIndex, guideFile });
}

// ── path-b: brand-new headless Astro project ─────────────────────────────────
async function modeNew(args) {
  const business = args["business-name"];
  const folder = args["folder-name"];
  if (!business || !folder) fail("missing_args", { need: ["--business-name", "--folder-name"], hint: "The agent derives these from the user's prompt." });
  const parent = path.resolve(args.dir || ".");
  fs.mkdirSync(parent, { recursive: true });

  await login();

  emit("scaffolding", { business, folder });
  const create = spawnSync(bin("npm"), ["create", "@wix/new@latest", "headless", "--",
    "--business-name", business, "--folder-name", folder, "--site-template", "blank", "--no-publish"],
    { cwd: parent, stdio: "inherit", shell: false });
  if (create.status !== 0) fail("scaffold_failed", { status: create.status ?? 1 });

  const projectDir = path.join(parent, folder);
  const cfg = readConfig(projectDir);
  const siteId = cfg?.json?.siteId || null;

  emit("building");
  const build = capture(WIX[0], [...WIX.slice(1), "build"], { cwd: projectDir });
  if (build.status !== 0) fail("build_failed", { detail: build.out.trim().slice(-600) });

  const liveUrl = release(projectDir);
  const health = await verify(liveUrl);
  emit("verified", { liveUrl, httpStatus: health.httpStatus, ok: health.ok });
  const guideFile = writeGuide(projectDir, { mode: "new", liveUrl, dashboardUrl: dashboardUrl(siteId), siteId });
  emit("done", { mode: "new", liveUrl, dashboardUrl: dashboardUrl(siteId), siteId, projectDir, openFile: path.join(projectDir, "src", "pages", "index.astro"), guideFile });
}

// ── main ─────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write("Usage:\n  node bootstrap.mjs --download-url <zipUrl>            # /deployed flow (download+release static)\n  node bootstrap.mjs --dir <unzipped-folder>            # /deployed flow (already unzipped)\n  node bootstrap.mjs --new --business-name \"Name\" --folder-name name   # new headless project\n");
  process.exit(0);
}
checkNode();
checkCli();
(args.new ? modeNew(args) : modeContinue(args)).catch((e) => fail("unexpected_error", { detail: String(e && e.stack || e) }));
