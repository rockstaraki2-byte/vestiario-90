import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/fetch-brazil-state-competitions-2026-v2.mjs";
const TEMP = "scripts/.state-sync-v3-runtime.mjs";

const original = await readFile(SOURCE, "utf8");
const start = original.indexOf("async function searchClubId(query) {");
const end = original.indexOf("async function idsFromVerifiedNames(code) {");
if (start < 0 || end < 0 || end <= start) throw new Error("Could not locate state club search function");

const replacement = String.raw`function decodeHtmlText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}
function htmlClubCandidates(html) {
  const found = new Map();
  const pattern = /<a[^>]+href=["']([^"']*\/(?:startseite|profil|kader)\/verein\/(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const id = String(match[2]);
    let name = decodeHtmlText(match[3]);
    if (!name) {
      const slug = String(match[1]).split("/").filter(Boolean)[0] ?? "";
      name = slug.replace(/-/g, " ");
    }
    if (!found.has(id) || name.length > found.get(id).name.length) found.set(id, { id, name });
  }
  return [...found.values()];
}
async function searchClubId(query) {
  for (const domain of SEARCH_DOMAINS) {
    try {
      const jsonUrl = domain + "/news/search?index=clubs_lang_new&q=" + encodeURIComponent(query);
      const response = await fetch(jsonUrl, { headers:{...siteHeaders,Accept:"application/json,text/plain,*/*"}, redirect:"follow" });
      if (response.ok) {
        const text = await response.text();
        try {
          const candidates = searchCandidates(JSON.parse(text)).sort((a,b) => scoreCandidate(query,b) - scoreCandidate(query,a));
          if (candidates[0] && scoreCandidate(query,candidates[0]) >= 8) return candidates[0];
        } catch {}
      }
    } catch {}
    try {
      const htmlUrl = domain + "/schnellsuche/ergebnis/schnellsuche?query=" + encodeURIComponent(query);
      const response = await fetch(htmlUrl, { headers:siteHeaders, redirect:"follow" });
      if (!response.ok) continue;
      const candidates = htmlClubCandidates(await response.text()).sort((a,b) => scoreCandidate(query,b) - scoreCandidate(query,a));
      const best = candidates[0];
      if (best && scoreCandidate(query,best) >= 8) return best;
    } catch (error) { console.warn("HTML team search failed", query, domain, String(error)); }
  }
  return null;
}
`;

const patched = original.slice(0, start) + replacement + original.slice(end);
await writeFile(TEMP, patched);
try {
  await import(`./.state-sync-v3-runtime.mjs?run=${Date.now()}`);
} finally {
  await unlink(TEMP).catch(() => {});
}
