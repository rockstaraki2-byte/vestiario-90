import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/fetch-brazil-state-competitions-2026-v2.mjs";
const TEMP = "scripts/.state-sync-v5-runtime.mjs";
const PRIORITY_IDS = ["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"];

const original = await readFile(SOURCE, "utf8");
const searchStart = original.indexOf("async function searchClubId(query) {");
const searchEnd = original.indexOf("async function idsFromVerifiedNames(code) {");
const verifiedEnd = original.indexOf("async function idsFromQuickselect(code) {");
if (searchStart < 0 || searchEnd < 0 || verifiedEnd < 0 || !(searchStart < searchEnd && searchEnd < verifiedEnd)) {
  throw new Error("Could not locate state resolver functions");
}

const imports = `import { BRASILEIRAO_2026_CLUBS } from "../src/data/brasileirao-2026/transfermarkt-snapshot.ts";\nimport { BRAZIL_2026_EXPANDED_COMPETITIONS } from "../src/data/brazil-2026/expanded-rosters.ts";\nimport { BRAZIL_SERIE_D_2026_CLUBS } from "../src/data/brazil-2026/serie-d.ts";\nimport { BRAZIL_STATE_2026_COMPETITIONS as EXISTING_STATE_COMPETITIONS } from "../src/data/world-2026/state-competitions.generated.ts";\nconst SPRINT2_PRIORITY_IDS = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"]);\n`;

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
const NATIONAL_KNOWN_CLUBS = (() => {
  const expanded = BRAZIL_2026_EXPANDED_COMPETITIONS.filter((competition) => competition.kind === "professional").flatMap((competition) => competition.clubs);
  const state = EXISTING_STATE_COMPETITIONS.flatMap((competition) => competition.clubs ?? []);
  const all = [...BRASILEIRAO_2026_CLUBS, ...expanded, ...BRAZIL_SERIE_D_2026_CLUBS, ...state];
  return [...new Map(all.filter((club) => club?.transfermarktId).map((club) => [String(club.transfermarktId), club])).values()];
})();
const KNOWN_ALIASES = {
  "atletico mineiro":"atletico mg", "america mineiro":"america mg", "athletic club mg":"athletic club",
  "gremio fbpa":"gremio", "sc internacional":"internacional", "ser caxias do sul":"caxias",
  "ec internacional de santa maria":"inter santa maria", "ec sao jose rs":"sao jose rs", "ec novo hamburgo":"novo hamburgo",
  "guarany de bage fc":"guarany bage", "ec sao luiz ijui":"sao luiz", "ypiranga fc erechim":"ypiranga rs",
  "operario fec":"operario pr", "if sao joseense":"sao joseense", "fc cascavel":"cascavel", "foz do iguacu fc":"foz do iguacu",
  "clube andraus brasil":"andraus", "galo maringa":"galo maringa",
  "ec bahia":"bahia", "ec vitoria":"vitoria ba", "alagoinhas ac":"atletico alagoinhas", "ad bahia de feira":"bahia de feira",
  "ec jacuipense":"jacuipense", "sd juazeirense":"juazeirense", "galicia ec":"galicia", "ad jequie":"jequie", "barcelona de ilheus fc":"barcelona ilheus",
  "sport recife":"sport", "nautico":"nautico", "aa maguary":"maguary", "santa cruz fc pe":"santa cruz pe",
  "aad vitoria das tabocas":"vitoria pe", "decisao fc":"decisao", "retro fc brasil":"retro", "ad jaguar pe":"jaguar pe",
  "goias ec":"goias", "vila nova fc":"vila nova", "atletico goianiense":"atletico go", "anapolis fc":"anapolis",
  "goiatuba ec":"goiatuba", "crac catalao":"crac", "aa anapolina":"anapolina", "aa aparecidense":"aparecidense",
  "ae jataiense":"jataiense", "inhumas ec":"inhumas", "centro oeste fc go":"centro oeste", "abecat ouvidorense":"abecat"
};
const CLUB_NOISE = new Set(["fc","ec","sc","ac","aa","ad","ao","se","ser","cf","cr","saf","clube","club","futebol","football","esporte","esportivo","associacao","sociedade","sport","de","do","da","dos","das"]);
function clubCore(value) {
  const aliased = KNOWN_ALIASES[norm(value)] ?? norm(value);
  return aliased.split(" ").filter((token) => token && !CLUB_NOISE.has(token)).join(" ");
}
function knownScore(query, club) {
  const q = clubCore(query), c = clubCore(club.name);
  if (!q || !c) return -999;
  if (q === c) return 100;
  if (q.length >= 5 && c.length >= 5 && (q.includes(c) || c.includes(q))) return 80;
  const qt = new Set(q.split(" ")), ct = new Set(c.split(" "));
  const common = [...qt].filter((token) => ct.has(token));
  if (!common.length) return -999;
  const ratio = common.length / Math.max(qt.size, ct.size);
  return ratio * 60 + common.reduce((sum, token) => sum + Math.min(token.length, 8), 0);
}
function knownClubMatch(query) {
  const ranked = NATIONAL_KNOWN_CLUBS.map((club) => ({club, score:knownScore(query, club)})).sort((a,b) => b.score - a.score);
  const best = ranked[0], second = ranked[1];
  if (!best || best.score < 34) return null;
  if (second && best.score < 80 && best.score - second.score < 8) return null;
  return {id:String(best.club.transfermarktId), name:best.club.name, score:best.score};
}
async function idsFromVerifiedNames(code) {
  const names = VERIFIED_NAMES_2026[code] ?? [];
  if (!names.length) return [];
  const hits = [];
  for (const name of names) {
    const known = knownClubMatch(name);
    const hit = known ?? await searchClubId(name);
    if (hit) { hits.push(hit.id); console.log("name fallback", code, name, "=>", hit.id, hit.name, known ? "national-index" : "external-search"); }
    else console.warn("name fallback miss", code, name);
    await sleep(40);
  }
  const ids = uniq(hits);
  const minimum = Math.max(6, Math.ceil(names.length * 0.72));
  if (ids.length < minimum) throw new Error(code + ": verified-name resolver returned " + ids.length + "/" + names.length + ", minimum " + minimum);
  return ids;
}
`;

let patched = imports + original.slice(0, searchStart) + replacement + original.slice(verifiedEnd);
patched = patched.replace(
  'const NEVER_PRESERVE = new Set(["RSA1","BAA1","PAA1"]);',
  'const NEVER_PRESERVE = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1","PAA1"]);'
);
patched = patched.replace(
  'for(const spec of SPECS){\n  try{const competition=await build(spec);',
  'for(const spec of SPECS){\n  if(!SPRINT2_PRIORITY_IDS.has(spec[0])){const fallback=previousById.get(spec[0]);if(fallback){built.push(fallback);preserved++;}continue;}\n  try{const competition=await build(spec);'
);
await writeFile(TEMP, patched);
try {
  await import(`./.state-sync-v5-runtime.mjs?run=${Date.now()}`);
  const generated = await readFile("src/data/world-2026/state-competitions.generated.ts", "utf8");
  for (const id of PRIORITY_IDS) {
    if (!generated.includes(`\"id\":\"${id}\"`)) throw new Error(`Priority state ${id} was not generated`);
  }
} finally {
  await unlink(TEMP).catch(() => {});
}
