import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/fetch-brazil-state-competitions-2026-v2.mjs";
const TEMP = "scripts/.state-sync-v4-runtime.mjs";
const original = await readFile(SOURCE, "utf8");
const start = original.indexOf("async function idsFromVerifiedNames(code) {");
const end = original.indexOf("async function idsFromQuickselect(code) {");
if (start < 0 || end < 0 || end <= start) throw new Error("Could not locate verified-name resolver");

const imports = `import { BRASILEIRAO_2026_CLUBS } from "../src/data/brasileirao-2026/transfermarkt-snapshot.ts";\nimport { BRAZIL_2026_EXPANDED_COMPETITIONS } from "../src/data/brazil-2026/expanded-rosters.ts";\nimport { BRAZIL_SERIE_D_2026_CLUBS } from "../src/data/brazil-2026/serie-d.ts";\nimport { BRAZIL_STATE_2026_COMPETITIONS as EXISTING_STATE_COMPETITIONS } from "../src/data/world-2026/state-competitions.generated.ts";\n`;

const replacement = String.raw`const NATIONAL_KNOWN_CLUBS = (() => {
  const expanded = BRAZIL_2026_EXPANDED_COMPETITIONS.filter((competition) => competition.kind === "professional").flatMap((competition) => competition.clubs);
  const state = EXISTING_STATE_COMPETITIONS.flatMap((competition) => competition.clubs ?? []);
  const all = [...BRASILEIRAO_2026_CLUBS, ...expanded, ...BRAZIL_SERIE_D_2026_CLUBS, ...state];
  return [...new Map(all.filter((club) => club?.transfermarktId).map((club) => [String(club.transfermarktId), club])).values()];
})();
const KNOWN_ALIASES = {
  "atletico mineiro":"atletico mg", "america mineiro":"america mg", "athletic club mg":"athletic club",
  "gremio fbpa":"gremio", "sc internacional":"internacional", "ser caxias do sul":"caxias",
  "operario fec":"operario pr", "clube do remo pa":"remo", "sport recife":"sport",
  "nautico":"nautico", "vila nova fc":"vila nova", "atletico goianiense":"atletico go",
  "sampaio correa fc":"sampaio correa", "moto club":"moto club", "imperatriz ma":"imperatriz",
  "amazonas fc":"amazonas", "nacional fc am":"nacional", "manaus fc":"manaus",
  "monte roraima fc":"monte roraima", "ga sampaio rr":"ga sampaio", "sao raimundo rr":"sao raimundo",
  "porto velho ec":"porto velho", "tocantinopolis ec":"tocantinopolis", "brasiliense fc":"brasiliense",
  "ceilandia ec":"ceilandia", "capital cf df":"capital df", "costa rica ec ms":"costa rica ms",
  "dourados ac":"dourados", "fc pantanal ms":"pantanal", "asa de arapiraca":"asa",
  "ad confianca":"confianca", "ao itabaiana":"itabaiana", "cs sergipe":"sergipe",
  "aa altos":"altos", "parnahyba sc":"parnahyba", "manauara ec":"manauara",
  "princesa do solimoes ec":"princesa do solimoes", "sc humaita":"humaita",
  "rio branco fc ac":"rio branco ac", "trem dc":"trem", "ypiranga clube ap":"ypiranga ap"
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

const patched = imports + original.slice(0, start) + replacement + original.slice(end);
await writeFile(TEMP, patched);
try {
  await import(`./.state-sync-v4-runtime.mjs?run=${Date.now()}`);
} finally {
  await unlink(TEMP).catch(() => {});
}
