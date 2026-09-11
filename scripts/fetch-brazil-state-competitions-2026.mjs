import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE = "https://tmapi-alpha.transfermarkt.technology";
const STATE_FILE = "src/data/world-2026/state-competitions.generated.ts";
const TRANSFERMARKT_DOMAINS = [
  "https://www.transfermarkt.com.tr",
  "https://www.transfermarkt.com",
  "https://www.transfermarkt.com.br",
  "https://www.transfermarkt.de",
  "https://www.transfermarkt.co.uk",
];
const headers = { Accept:"application/json", "Accept-Language":"pt-BR", "User-Agent":"Mozilla/5.0 (Vestiario90 state sync)" };
const siteHeaders = {
  Accept:"text/html,application/xhtml+xml,application/json",
  "Accept-Language":"pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control":"no-cache",
  Referer:"https://www.transfermarkt.com/",
  "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
};
const POS = { GOL:"GOL", ZAG:"ZAG", LD:"LD", LE:"LE", VOL:"VOL", MC:"MC", MEI:"MEI", PD:"PD", PE:"PE", CA:"ATA", SA:"ATA", MD:"PD" };
const SPECS = [
  ["SPA1","BCP1","Campeonato Paulista","SP","A1"], ["RJA1","BRCG","Campeonato Carioca","RJ","A1"], ["MGA1","BRCM","Campeonato Mineiro","MG","A1"],
  ["RSA1","BRRS","Campeonato Gaúcho","RS","A1"], ["PRA1","BRPR","Campeonato Paranaense","PR","A1"], ["SCA1","BRSC","Campeonato Catarinense","SC","A1"],
  ["BAA1","BRCB","Campeonato Baiano","BA","A1"], ["CEA1","BRCE","Campeonato Cearense","CE","A1"], ["PEA1","BRPE","Campeonato Pernambucano","PE","A1"],
  ["GOA1","BRGO","Campeonato Goiano","GO","A1"], ["PAA1","BRPA","Campeonato Paraense","PA","A1"], ["ALA1","BRAL","Campeonato Alagoano","AL","A1"],
  ["RNA1","BRRN","Campeonato Potiguar","RN","A1"], ["PBA1","BRPB","Campeonato Paraibano","PB","A1"], ["SEA1","BRSE","Campeonato Sergipano","SE","A1"],
  ["MAA1","BRMA","Campeonato Maranhense","MA","A1"], ["PIA1","BRPI","Campeonato Piauiense","PI","A1"], ["AMA1","BRAM","Campeonato Amazonense","AM","A1"],
  ["ACA1","BRAC","Campeonato Acreano","AC","A1"], ["APA1","BRAP","Campeonato Amapaense","AP","A1"], ["RRA1","BRRR","Campeonato Roraimense","RR","A1"],
  ["ROA1","BRRD","Campeonato Rondoniense","RO","A1"], ["TOA1","BRTO","Campeonato Tocantinense","TO","A1"], ["DFA1","BRDF","Campeonato Brasiliense","DF","A1"],
  ["ESA1","BRES","Campeonato Capixaba","ES","A1"], ["MTA1","BRMS","Campeonato Mato-Grossense","MT","A1"], ["MSA1","BRMT","Campeonato Sul-Mato-Grossense","MS","A1"],
];

// IDs previously verified against 2026 participant pages. They remain a last-resort fallback;
// squads and player profiles are always requested live when the competition is refreshed.
const VERIFIED_PARTICIPANTS_2026 = {
  BRRS:["210","6600","11831","2043","3866","3468","15109","6454","6460","27974","11869","31695"],
  BRSC:["17776","7178","2035","4064","14390","3330","4759","22925","31534","36963","52519","73041"],
  BRCB:["10010","2125","11213","15227","10097","17618","19155","23189","20597","102372"],
  BRPA:["10997","993","14886","17273","50220","25538","17912","17911","30553","42935","68107","77288"],
  BRRN:["17905","18445","21914","22119","34344","61684","77307","110614"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uniq = (values) => [...new Set(values.map(String).filter(Boolean))];
const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const short = (name) => {
  const value = clean(name).replace(/\b(FC|AFC|CF|EC|SC|SAF|AC|AA|CR|SE|AD|AO|Clube|Club)\b/gi, "").trim();
  return (value.length <= 14 ? value : value.split(" ").map((word) => word[0]).join("")).toUpperCase().slice(0, 14);
};

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
  const value = (type) => parts.find((item) => item.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function api(path, attempt = 1) {
  try {
    const response = await fetch(`${BASE}/${path}`, { headers });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path} ${response.status} ${text.slice(0, 140)}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(450 * attempt);
    return api(path, attempt + 1);
  }
}

function tableIds(data) {
  return uniq((data?.data?.tables ?? []).flatMap((table) => table?.clubs ?? []).map((club) => club?.clubId ?? club?.id));
}
function clubListIds(data) {
  const rows = Array.isArray(data?.data) ? data.data : (data?.data?.clubs ?? data?.clubs ?? []);
  return uniq((rows ?? []).map((club) => club?.clubId ?? club?.id ?? club?.club?.id ?? club?.club?.clubId));
}
function idsFromJson(value) {
  const ids = [];
  const visit = (item) => {
    if (!item) return;
    if (Array.isArray(item)) return item.forEach(visit);
    if (typeof item !== "object") return;
    const candidate = item.clubId ?? item.teamId ?? item?.club?.id ?? item?.team?.id ?? item.id;
    const label = item.name ?? item.label ?? item.title ?? item?.club?.name ?? item?.team?.name;
    if (candidate && label && /^\d+$/.test(String(candidate))) ids.push(String(candidate));
    Object.values(item).forEach(visit);
  };
  visit(value);
  return uniq(ids);
}

async function idsFromQuickselect(code) {
  const paths = [`/quickselect/teams/${code}`, `/quickselect/teams/${code}/saison_id/2026`, `/quickselect/teams/${code}/saison_id/2025`];
  for (const domain of TRANSFERMARKT_DOMAINS) {
    for (const path of paths) {
      try {
        const response = await fetch(`${domain}${path}`, { headers:{ ...siteHeaders, Accept:"application/json,text/plain,*/*" }, redirect:"follow" });
        if (!response.ok) continue;
        const text = await response.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { continue; }
        const ids = idsFromJson(parsed);
        if (ids.length >= 6) {
          console.log("quickselect fallback", code, ids.length, domain, path);
          return ids;
        }
      } catch (error) {
        console.warn("quickselect failed", code, domain, path, String(error));
      }
    }
  }
  return [];
}

function idsFromHtml(html) {
  const table = html.match(/<table[^>]*class=["'][^"']*items[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0] ?? html;
  const patterns = [
    /\/verein\/(\d+)/g,
    /\/startseite\/verein\/(\d+)/g,
    /\/kader\/verein\/(\d+)/g,
    /data-verein-id=["'](\d+)["']/g,
  ];
  return uniq(patterns.flatMap((pattern) => [...table.matchAll(pattern)].map((match) => match[1])));
}

async function idsFromPublicPage(code) {
  const paths = [
    `/x/teilnehmer/pokalwettbewerb/${code}`,
    `/x/teilnehmer/pokalwettbewerb/${code}/saison_id/2026`,
    `/x/teilnehmer/pokalwettbewerb/${code}/saison_id/2025`,
    `/x/startseite/wettbewerb/${code}`,
    `/x/startseite/wettbewerb/${code}/saison_id/2026`,
    `/x/startseite/wettbewerb/${code}/saison_id/2025`,
  ];
  for (const domain of TRANSFERMARKT_DOMAINS) {
    for (const path of paths) {
      try {
        const response = await fetch(`${domain}${path}`, { headers:siteHeaders, redirect:"follow" });
        if (!response.ok) continue;
        const html = await response.text();
        const ids = idsFromHtml(html);
        if (ids.length >= 6) {
          console.log("html fallback", code, ids.length, domain, path);
          return ids;
        }
      } catch (error) {
        console.warn("html failed", code, domain, path, String(error));
      }
    }
  }
  return [];
}

async function competitionIds(code) {
  try {
    const ids = tableIds(await api(`competition/${code}/table`));
    if (ids.length >= 6) return { ids, source:"tmapi-table" };
  } catch (error) { console.warn("table failed", code, String(error)); }
  try {
    const ids = clubListIds(await api(`competition/${code}/clubs`));
    if (ids.length >= 6) return { ids, source:"tmapi-clubs" };
  } catch (error) { console.warn("clubs failed", code, String(error)); }

  const quick = await idsFromQuickselect(code);
  if (quick.length >= 6) return { ids:quick, source:"transfermarkt-quickselect" };
  const publicIds = await idsFromPublicPage(code);
  if (publicIds.length >= 6) return { ids:publicIds, source:"transfermarkt-public" };
  const verified = VERIFIED_PARTICIPANTS_2026[code];
  if (verified?.length >= 6) {
    console.log("verified participant fallback", code, verified.length);
    return { ids:verified, source:"verified-2026-participants" };
  }
  throw new Error(`${code}: no participant source returned at least 6 clubs`);
}

async function clubs(ids) {
  const found = new Map();
  for (let index = 0; index < ids.length; index += 20) {
    const chunk = ids.slice(index, index + 20);
    const query = chunk.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
    try {
      for (const club of (await api(`clubs?${query}`))?.data ?? []) found.set(String(club.id), club);
    } catch (error) {
      console.warn("club batch failed; retrying one by one", String(error));
      for (const id of chunk) {
        try {
          const club = (await api(`clubs?ids[]=${encodeURIComponent(id)}`))?.data?.[0];
          if (club) found.set(String(club.id), club);
        } catch (singleError) {
          console.warn("club resolve failed", id, String(singleError));
        }
      }
    }
  }
  return ids.map((id) => found.get(String(id))).filter(Boolean);
}

async function squad(id) {
  return uniq(((await api(`club/${id}/squad`))?.data?.squad ?? []).map((item) => item?.playerId));
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
  const [id, tmCode, name, state, tier] = spec;
  const { ids, source } = await competitionIds(tmCode);
  const resolvedClubs = await clubs(ids);
  if (resolvedClubs.length < 6) throw new Error(`${tmCode}: only ${resolvedClubs.length}/${ids.length} resolved clubs`);

  const squads = new Map();
  const allPlayers = new Set();
  const clubErrors = [];
  await mapLimit(resolvedClubs, 5, async (club) => {
    try {
      const ids = await squad(club.id);
      squads.set(String(club.id), ids);
      ids.forEach((playerId) => allPlayers.add(playerId));
    } catch (error) {
      clubErrors.push({ clubId:String(club.id), error:String(error) });
      squads.set(String(club.id), []);
    }
  });

  const profiles = new Map();
  const playerIds = [...allPlayers];
  for (let index = 0; index < playerIds.length; index += 40) {
    const query = playerIds.slice(index, index + 40).map((playerId) => `ids[]=${encodeURIComponent(playerId)}`).join("&");
    try {
      const data = await api(`players?${query}`);
      for (const profile of data?.data ?? []) profiles.set(String(profile.id), profile);
    } catch (error) {
      clubErrors.push({ clubId:"profiles", error:`batch ${index}: ${String(error)}` });
    }
  }

  const rosters = resolvedClubs.map((club) => {
    const players = (squads.get(String(club.id)) ?? []).map((playerId) => profiles.get(playerId)).filter(Boolean).map(player).filter(Boolean);
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
  const players = rosters.reduce((count, club) => count + club.players.length, 0);
  const partialClubs = rosters.filter((club) => club.players.length < 10).map((club) => club.name);
  return { id, tmCode, name, state, tier, season:2026, sourceMode:source, coverage:{ clubs:rosters.length, players, partialClubs, clubErrors }, clubs:rosters };
}

function parsePrevious(source) {
  const marker = "export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=";
  const start = source.indexOf(marker);
  if (start < 0) return [];
  const jsonStart = start + marker.length;
  const end = source.indexOf(";", jsonStart);
  if (end < 0) return [];
  try { return JSON.parse(source.slice(jsonStart, end)); } catch { return []; }
}

let previous = [];
try { previous = parsePrevious(await readFile(STATE_FILE, "utf8")); } catch {}
const previousById = new Map(previous.map((competition) => [competition.id, competition]));
const built = [];
const errors = [];
let refreshed = 0;
let preserved = 0;

for (const spec of SPECS) {
  try {
    const competition = await build(spec);
    built.push(competition);
    refreshed += 1;
    console.log("OK", competition.id, competition.clubs.length, competition.coverage.players, competition.sourceMode, "partial", competition.coverage.partialClubs.length);
  } catch (error) {
    const fallback = previousById.get(spec[0]);
    if (fallback?.clubs?.length >= 6) {
      built.push({ ...fallback, sourceMode:`${fallback.sourceMode ?? "previous"}+preserved` });
      preserved += 1;
      console.warn("PRESERVE", spec[0], fallback.clubs.length, String(error));
    } else {
      console.error("SKIP", spec[0], String(error));
    }
    errors.push({ id:spec[0], tmCode:spec[1], name:spec[2], state:spec[3], tier:spec[4], preserved:Boolean(fallback?.clubs?.length >= 6), error:String(error) });
  }
}

if (!built.length) throw new Error("No Brazilian state championship imported or preserved");
built.sort((a, b) => SPECS.findIndex((spec) => spec[0] === a.id) - SPECS.findIndex((spec) => spec[0] === b.id));
await mkdir("src/data/world-2026", { recursive:true });
const snapshot = todaySaoPaulo();
const output = [
  'import type { EuropeClubRoster } from "../europe-2026/top-leagues";',
  'export type BrazilStateCompetitionRoster={id:string;tmCode:string;name:string;state:string;tier:"A1"|"A2"|"B";season:2026;sourceMode?:string;coverage?:{clubs:number;players:number;partialClubs:string[];clubErrors:Array<{clubId:string;error:string}>};clubs:EuropeClubRoster[]};',
  `export const BRAZIL_STATE_2026_META=${JSON.stringify({ snapshot, requested:SPECS.length, imported:built.length, refreshed, preserved, source:"Transfermarkt API + quickselect + multi-domain participant pages + verified fallback; previous verified competition preserved on transient source failure" })} as const;`,
  `export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=${JSON.stringify(built)};`,
  `export const BRAZIL_STATE_2026_SYNC_ERRORS=${JSON.stringify(errors)} as const;`,
  "",
];
await writeFile(STATE_FILE, output.join("\n"));
console.log("DONE", built.length, "available /", refreshed, "refreshed /", preserved, "preserved /", errors.length, "source errors");
