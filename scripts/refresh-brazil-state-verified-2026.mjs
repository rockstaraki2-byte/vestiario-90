import { readFile, writeFile } from "node:fs/promises";

// Run the normal discovery first. This remains the preferred source whenever it works.
await import("./fetch-brazil-state-competitions-2026.mjs");

const FILE = "src/data/world-2026/state-competitions.generated.ts";
const BASE = "https://tmapi-alpha.transfermarkt.technology";
const headers = { Accept:"application/json", "Accept-Language":"pt-BR", "User-Agent":"Mozilla/5.0 (Vestiario90 verified state fallback)" };
const POS = { GOL:"GOL", ZAG:"ZAG", LD:"LD", LE:"LE", VOL:"VOL", MC:"MC", MEI:"MEI", PD:"PD", PE:"PE", CA:"ATA", SA:"ATA", MD:"PD" };

// 2026 participant IDs verified against the corresponding Transfermarkt participant pages.
// These IDs are only used to discover the clubs. Squad and player data are still refreshed live.
const VERIFIED = [
  {
    id:"RJA1", tmCode:"BRCG", name:"Campeonato Carioca", state:"RJ", tier:"A1",
    ids:["614","537","2462","978","40120","4176","4745","4907","11266","16108","52517","63296"],
    reference:"Transfermarkt Campeonato Carioca 2026 participants",
  },
  {
    id:"RNA1", tmCode:"BRRN", name:"Campeonato Potiguar", state:"RN", tier:"A1",
    ids:["108000","1751","7209","49067","51851","61868","96018","126428"],
    reference:"Transfermarkt Campeonato Potiguar 2026 participants",
  },
  {
    id:"PBA1", tmCode:"BRPB", name:"Campeonato Paraibano", state:"PB", tier:"A1",
    ids:["17964","1753","11086","18236","28021","28026","36010","65479","93513","103709"],
    reference:"Transfermarkt Campeonato Paraibano 2026 participants",
  },
  {
    id:"ESA1", tmCode:"BRES", name:"Campeonato Capixaba", state:"ES", tier:"A1",
    ids:["30489","12530","22013","29718","32934","36478","55042","64380","93843","137890"],
    reference:"Transfermarkt Campeonato Capixaba 2026 participants",
  },
  {
    id:"MTA1", tmCode:"BRMS", name:"Campeonato Mato-Grossense", state:"MT", tier:"A1",
    ids:["28022","60520","96024","32542","28199","11900","21599","86822","98845","137868"],
    reference:"Transfermarkt Campeonato Mato-Grossense 2026 participants",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uniq = (values) => [...new Set(values.map(String).filter(Boolean))];
const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const short = (name) => {
  const value = clean(name).replace(/\b(FC|AFC|CF|EC|SC|SAF|AC|AA|CR|SE|AD|AO|Clube|Club)\b/gi, "").trim();
  return (value.length <= 14 ? value : value.split(" ").map((word) => word[0]).join("")).toUpperCase().slice(0, 14);
};

async function api(path, attempt = 1) {
  try {
    const response = await fetch(`${BASE}/${path}`, { headers });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${text.slice(0, 160)}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(400 * attempt);
    return api(path, attempt + 1);
  }
}

async function mapLimit(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length:Math.min(limit, items.length) }, worker));
  return output;
}

function parseExport(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  const jsonStart = start + marker.length;
  const end = source.indexOf(";", jsonStart);
  if (end < 0) throw new Error(`terminator not found: ${marker}`);
  const raw = source.slice(jsonStart, end).replace(/\s+as const\s*$/, "");
  return JSON.parse(raw);
}

async function resolveClubs(ids) {
  const found = new Map();
  for (let index = 0; index < ids.length; index += 20) {
    const chunk = ids.slice(index, index + 20);
    const query = chunk.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
    try {
      for (const club of (await api(`clubs?${query}`))?.data ?? []) found.set(String(club.id), club);
    } catch {
      for (const id of chunk) {
        try {
          const club = (await api(`clubs?ids[]=${encodeURIComponent(id)}`))?.data?.[0];
          if (club) found.set(String(club.id), club);
        } catch (error) {
          console.warn("verified state club resolve failed", id, String(error));
        }
      }
    }
  }
  return ids.map((id) => found.get(String(id))).filter(Boolean);
}

async function squad(id) {
  return uniq(((await api(`club/${id}/squad`))?.data?.squad ?? []).map((item) => item?.playerId));
}

function player(profile) {
  const age = profile?.lifeDates?.age;
  if (typeof age !== "number") return null;
  const raw = profile?.marketValueDetails?.current?.value;
  const marketValueEur = typeof raw === "number" && raw > 0 ? raw : null;
  return {
    transfermarktId:String(profile.id),
    name:clean(profile.name),
    position:POS[profile?.attributes?.position?.shortName] ?? "MC",
    age,
    marketValueEur,
    ...(profile?.marketValueDetails?.current?.determined && marketValueEur !== null ? { marketValueUpdated:profile.marketValueDetails.current.determined } : {}),
  };
}

async function build(spec) {
  const resolved = await resolveClubs(spec.ids);
  if (resolved.length < 6) throw new Error(`${spec.tmCode}: only ${resolved.length}/${spec.ids.length} verified clubs resolved`);

  const squads = new Map();
  const allPlayerIds = new Set();
  const clubErrors = [];
  await mapLimit(resolved, 5, async (club) => {
    try {
      const ids = await squad(club.id);
      squads.set(String(club.id), ids);
      ids.forEach((id) => allPlayerIds.add(id));
    } catch (error) {
      clubErrors.push({ clubId:String(club.id), error:String(error) });
      squads.set(String(club.id), []);
    }
  });

  const profiles = new Map();
  const playerIds = [...allPlayerIds];
  for (let index = 0; index < playerIds.length; index += 40) {
    const query = playerIds.slice(index, index + 40).map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
    try {
      for (const profile of (await api(`players?${query}`))?.data ?? []) profiles.set(String(profile.id), profile);
    } catch (error) {
      clubErrors.push({ clubId:"profiles", error:`batch ${index}: ${String(error)}` });
    }
  }

  const clubs = resolved.map((club) => {
    const players = (squads.get(String(club.id)) ?? []).map((id) => profiles.get(id)).filter(Boolean).map(player).filter(Boolean);
    return {
      sourceId:0,
      transfermarktId:Number(club.id),
      name:clean(club.name),
      shortName:short(club.name),
      imageUrl:`https://tmssl.akamaized.net/images/wappen/head/${club.id}.png`,
      marketValueEur:players.reduce((sum, item) => sum + (item.marketValueEur ?? 0), 0),
      players,
    };
  });
  const totalPlayers = clubs.reduce((sum, club) => sum + club.players.length, 0);
  return {
    id:spec.id,
    tmCode:spec.tmCode,
    name:spec.name,
    state:spec.state,
    tier:spec.tier,
    season:2026,
    sourceMode:"verified-2026-participants+tmapi-live-squads",
    coverage:{
      clubs:clubs.length,
      players:totalPlayers,
      partialClubs:clubs.filter((club) => club.players.length < 10).map((club) => club.name),
      clubErrors,
    },
    clubs,
  };
}

const source = await readFile(FILE, "utf8");
const competitions = parseExport(source, "export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=");
const originalErrors = parseExport(source, "export const BRAZIL_STATE_2026_SYNC_ERRORS=");
const byId = new Map(competitions.map((competition) => [competition.id, competition]));
const fallbackErrors = [];

for (const spec of VERIFIED) {
  if (byId.has(spec.id)) continue;
  try {
    const competition = await build(spec);
    byId.set(spec.id, competition);
    console.log("VERIFIED OK", spec.id, competition.clubs.length, competition.coverage.players, spec.reference);
  } catch (error) {
    fallbackErrors.push({ id:spec.id, tmCode:spec.tmCode, name:spec.name, state:spec.state, tier:spec.tier, error:String(error), reference:spec.reference });
    console.error("VERIFIED FAIL", spec.id, String(error));
  }
}

const specOrder = ["SPA1","RJA1","MGA1","RSA1","PRA1","SCA1","BAA1","CEA1","PEA1","GOA1","PAA1","ALA1","RNA1","PBA1","SEA1","MAA1","PIA1","AMA1","ACA1","APA1","RRA1","ROA1","TOA1","DFA1","ESA1","MTA1","MSA1"];
const merged = [...byId.values()].sort((a, b) => specOrder.indexOf(a.id) - specOrder.indexOf(b.id));
const loaded = new Set(merged.map((item) => item.id));
const errors = [
  ...originalErrors.filter((item) => !loaded.has(item.id) && !VERIFIED.some((spec) => spec.id === item.id)),
  ...fallbackErrors,
];
const snapshotMatch = source.match(/"snapshot":"(\d{4}-\d{2}-\d{2})"/);
const snapshot = snapshotMatch?.[1] ?? new Date().toISOString().slice(0, 10);
const totalPlayers = merged.reduce((sum, competition) => sum + competition.clubs.reduce((clubSum, club) => clubSum + club.players.length, 0), 0);

const output = [
  'import type { EuropeClubRoster } from "../europe-2026/top-leagues";',
  'export type BrazilStateCompetitionRoster={id:string;tmCode:string;name:string;state:string;tier:"A1"|"A2"|"B";season:2026;sourceMode?:string;coverage?:{clubs:number;players:number;partialClubs:string[];clubErrors:Array<{clubId:string;error:string}>};clubs:EuropeClubRoster[]};',
  `export const BRAZIL_STATE_2026_META=${JSON.stringify({ snapshot, requested:27, imported:merged.length, verifiedFallbacks:VERIFIED.filter((spec) => loaded.has(spec.id)).length, players:totalPlayers, source:"Transfermarkt/TMAPI discovery plus verified 2026 participant IDs with live squad refresh" })} as const;`,
  `export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=${JSON.stringify(merged)};`,
  `export const BRAZIL_STATE_2026_SYNC_ERRORS=${JSON.stringify(errors)} as const;`,
  "",
].join("\n");

await writeFile(FILE, output);
console.log("VERIFIED STATE DONE", `${merged.length}/27 competitions`, `${totalPlayers} players`, `${errors.length} remaining errors`);
