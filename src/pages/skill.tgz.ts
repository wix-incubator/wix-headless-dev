import type { APIRoute } from "astro";
import { skillFiles } from "../lib/skill-files";

const CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=86400";
const encoder = new TextEncoder();

function writeString(buf: Uint8Array, offset: number, value: string, maxLen: number) {
  const bytes = encoder.encode(value);
  buf.set(bytes.subarray(0, Math.min(bytes.length, maxLen)), offset);
}

function writeOctal(buf: Uint8Array, offset: number, value: number, len: number) {
  const s = value.toString(8).padStart(len - 1, "0");
  writeString(buf, offset, s, len - 1);
}

function makeHeader(name: string, size: number, mtime: number): Uint8Array {
  const buf = new Uint8Array(512);
  // ustar limits name to 100 bytes; longer paths use the prefix field (155 bytes).
  let nameField = name;
  let prefixField = "";
  if (encoder.encode(name).length > 100) {
    const slash = name.lastIndexOf("/", 100);
    if (slash === -1) throw new Error(`Path too long for ustar: ${name}`);
    prefixField = name.slice(0, slash);
    nameField = name.slice(slash + 1);
  }
  writeString(buf, 0, nameField, 100);
  writeOctal(buf, 100, 0o644, 8);
  writeOctal(buf, 108, 0, 8);
  writeOctal(buf, 116, 0, 8);
  writeOctal(buf, 124, size, 12);
  writeOctal(buf, 136, mtime, 12);
  for (let i = 148; i < 156; i++) buf[i] = 0x20; // checksum placeholder
  buf[156] = 0x30; // typeflag '0' = regular file
  writeString(buf, 257, "ustar", 6);
  writeString(buf, 263, "00", 2);
  if (prefixField) writeString(buf, 345, prefixField, 155);

  let sum = 0;
  for (let i = 0; i < 512; i++) sum += buf[i];
  writeString(buf, 148, sum.toString(8).padStart(6, "0"), 6);
  buf[154] = 0x00;
  buf[155] = 0x20;
  return buf;
}

function buildTar(entries: Array<{ name: string; content: Uint8Array }>): Uint8Array {
  const mtime = Math.floor(Date.now() / 1000);
  const chunks: Uint8Array[] = [];
  for (const { name, content } of entries) {
    chunks.push(makeHeader(name, content.length, mtime));
    chunks.push(content);
    const pad = (512 - (content.length % 512)) % 512;
    if (pad) chunks.push(new Uint8Array(pad));
  }
  chunks.push(new Uint8Array(1024)); // EOF: two zero blocks

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

async function gzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

const entries = skillFiles.map((f) => ({
  name: `wix-headless/${f.path}`,
  content: encoder.encode(f.content),
}));

let cached: Promise<Uint8Array> | null = null;
function getTgz(): Promise<Uint8Array> {
  if (!cached) cached = gzip(buildTar(entries));
  return cached;
}

export const prerender = false;

export const GET: APIRoute = async () => {
  const body = await getTgz();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": 'attachment; filename="wix-headless.tgz"',
      "Cache-Control": CACHE_HEADER,
      "X-Skill-Files": String(entries.length),
    },
  });
};
