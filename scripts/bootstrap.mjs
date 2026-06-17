#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import readline from "node:readline";

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

// ── 1. CLI reachable (via npx — no install) ──────────────────────────────────
function checkCli() {
  const r = capture(WIX[0], [...WIX.slice(1), "--version"]);
  if (r.status !== 0) fail("cli_unreachable", { detail: r.out.trim().slice(0, 400) });
  emit("cli_ok", { version: r.out.trim().split("\n").pop() });
}

// ── 2. Login (human-in-the-loop device code; forward the CLI's own events) ───
function login() {
  return new Promise((resolve) => {
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

// ── main ────────────────────────────────────────────────────────────────────
checkCli();
await login();
