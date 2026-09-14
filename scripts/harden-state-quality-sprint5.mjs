import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://tmapi-alpha.transfermarkt.technology";
const STATE_FILE = "src/data/world-2026/state-competitions.generated.ts";
const MIN_ROSTER = 18;
const headers = { Accept:"application/json", "Accept-Language":"pt-BR", "User-Agent":"Mozilla/5.0 (Vestiario90 sprint5 quality hardening)" };
const siteHeaders = {
  Accept:"text/html,application/xhtml+xml,*/*",
  "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.7",
  "Cache-Control":"no-cache",
  Referer:"https://www.transfermarkt.com.br/",
  "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
};
const POS = { GOL:"GOL", ZAG:"ZAG", LD:"LD", LE:"LE", VOL:"VOL", MC:"MC", MEI:"MEI", PD:"PD", PE:"PE", CA:"ATA", SA:"ATA", MD:"PD" };
const suspiciousNames = new Set(["pendencia","pendencias","pending","unknown","desconhecido","n a","null","undefined",""]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? "").trim().replace(/\s+/g," ");
const norm = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const validPlayerName = (name) => !suspiciousNames.has(norm(name)) && norm(name) !== "-";
const validPlayerId = (id) => /^\d+$/.test(String(id ?? ""));
const validCrest = (url) => /^https:\/\//i.test(String(url ?? "")) && !/generic-club\.svg/i.test(String(url));

async function api(path, attempt=1) {
  try {
    const response = await fetch(`${BASE}/${path}`, {headers});
    const text = await response.text();
    if (!response.ok) throw new Error(`${path} ${response.status} ${text.slice(0,120)}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(400 * attempt);
    return api(path, attempt + 1);
  }
}

function parseCompetitions(source) {
  const marker = "export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("State competition export not found");
  const jsonStart = start + marker.length;
  const end = source.indexOf(";", jsonStart);
  if (end < 0) throw new Error("State competition export end not found");
  return {jsonStart,end,competitions:JSON.parse(source.slice(jsonStart,end))};
}

function dedupePlayers(players) {
  const byId = new Map();
  for (const player of players ?? []) {
    if (!validPlayerId(player?.transfermarktId) || !validPlayerName(player?.name)) continue;
    const id = String(player.transfermarktId);
    const previous = byId.get(id);
    if (!previous || JSON.stringify(player).length > JSON.stringify(previous).length) byId.set(id, player);
  }
  return [...byId.values()];
}

function mapPlayer(profile) {
  const age = profile?.lifeDates?.age;
  const name = clean(profile?.name);
  if (typeof age !== "number" || !validPlayerName(name) || !validPlayerId(profile?.id)) return null;
  const raw = profile?.marketValueDetails?.current?.value;
  const marketValueEur = typeof raw === "number" && raw > 0 ? raw : null;
  return {
    transfermarktId:String(profile.id), name,
    position:POS[profile?.attributes?.position?.shortName] ?? "MC", age, marketValueEur,
    ...(profile?.marketValueDetails?.current?.determined && marketValueEur !== null ? {marketValueUpdated:profile.marketValueDetails.current.determined} : {})
  };
}

async function profilesForIds(playerIds) {
  const profiles=[];
  for (let index=0; index<playerIds.length; index+=40) {
    const query=playerIds.slice(index,index+40).map((id)=>`ids[]=${encodeURIComponent(id)}`).join("&");
    const data=(await api(`players?${query}`))?.data ?? [];
    profiles.push(...data);
  }
  return dedupePlayers(profiles.map(mapPlayer).filter(Boolean));
}

function playerIdsFromSquadHtml(html) {
  const table = html.match(/<table[^>]*class=["'][^"']*items[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0] ?? html;
  return [...new Set([...table.matchAll(/\/spieler\/(\d+)/g)].map((match)=>String(match[1])))];
}

async function publicSquadPlayerIds(clubId) {
  const domains=["https://www.transfermarkt.com.br","https://www.transfermarkt.com","https://www.transfermarkt.co.uk"];
  const paths=[`/x/kader/verein/${clubId}/saison_id/2025`,`/x/kader/verein/${clubId}`];
  let best=[];
  for (const domain of domains) for (const path of paths) {
    try {
      const response=await fetch(`${domain}${path}`,{headers:siteHeaders,redirect:"follow"});
      if(!response.ok) continue;
      const ids=playerIdsFromSquadHtml(await response.text());
      if(ids.length>best.length) best=ids;
      if(best.length>=MIN_ROSTER) return best;
    } catch {}
  }
  return best;
}

async function freshRoster(clubId) {
  let apiRoster=[];
  let apiError="";
  try {
    const apiIds=[...new Set(((await api(`club/${clubId}/squad`))?.data?.squad??[]).map((item)=>String(item?.playerId??"")).filter(validPlayerId))];
    apiRoster=await profilesForIds(apiIds);
  } catch (error) { apiError=String(error); }

  let publicRoster=[];
  try {
    const publicIds=await publicSquadPlayerIds(clubId);
    if(publicIds.length) publicRoster=await profilesForIds(publicIds);
  } catch {}

  if(publicRoster.length>apiRoster.length) return {players:publicRoster,source:"transfermarkt-public-squad",apiError};
  return {players:apiRoster,source:apiRoster.length>=MIN_ROSTER?"tmapi-squad":"tmapi-squad-partial",apiError};
}

let source = await readFile(STATE_FILE,"utf8");
const parsed = parseCompetitions(source);
if (parsed.competitions.length !== 27) throw new Error(`Sprint 5 requires complete 27-state baseline; found ${parsed.competitions.length}`);

const globalClubIds = new Map();
const results=[];
let refreshedClubs=0, removedSuspicious=0, removedDuplicatePlayers=0, repairedCrests=0;

for (const competition of parsed.competitions) {
  const clubErrors=[];
  const seenClubIds=new Set();
  for (const club of competition.clubs) {
    const clubId=String(club?.transfermarktId ?? "");
    if(!/^\d+$/.test(clubId)) throw new Error(`${competition.id}: invalid club identity for ${club?.name ?? "unknown"}`);
    if(seenClubIds.has(clubId)) throw new Error(`${competition.id}: duplicate club id ${clubId}`);
    seenClubIds.add(clubId);
    const globalPrevious=globalClubIds.get(clubId);
    if(globalPrevious && globalPrevious!==competition.id) throw new Error(`Club ${clubId} appears in multiple state championships: ${globalPrevious}, ${competition.id}`);
    globalClubIds.set(clubId,competition.id);

    const originalPlayers=club.players ?? [];
    const validExisting=originalPlayers.filter((p)=>validPlayerId(p?.transfermarktId)&&validPlayerName(p?.name));
    removedSuspicious += originalPlayers.length-validExisting.length;
    const cleanedExisting=dedupePlayers(validExisting);
    removedDuplicatePlayers += validExisting.length-cleanedExisting.length;
    club.players=cleanedExisting;

    if(!validCrest(club.imageUrl)) {
      club.imageUrl=`https://tmssl.akamaized.net/images/wappen/head/${clubId}.png`;
      repairedCrests++;
    }

    let sourceLabel="existing-clean";
    if(club.players.length<MIN_ROSTER) {
      try {
        const fresh=await freshRoster(clubId);
        sourceLabel=fresh.source;
        if(fresh.players.length>club.players.length || fresh.players.length>=MIN_ROSTER) {
          club.players=fresh.players;
          refreshedClubs++;
        }
        if(fresh.apiError && fresh.players.length<MIN_ROSTER) sourceLabel=`${sourceLabel}; api=${fresh.apiError.slice(0,120)}`;
      } catch(error) {
        sourceLabel=`refresh-error:${String(error).slice(0,140)}`;
      }
    }

    club.players=dedupePlayers(club.players);
    club.marketValueEur=club.players.reduce((sum,item)=>sum+(Number(item.marketValueEur)||0),0);
    if(club.players.length<MIN_ROSTER) {
      clubErrors.push({clubId,error:`source-limited roster ${club.players.length}/${MIN_ROSTER} (${sourceLabel})`});
    }
  }

  const players=competition.clubs.reduce((sum,club)=>sum+(club.players?.length??0),0);
  const partialClubs=competition.clubs.filter((club)=>(club.players?.length??0)<MIN_ROSTER).map((club)=>club.name);
  competition.coverage={clubs:competition.clubs.length,players,partialClubs,clubErrors};
  competition.sourceMode=`${String(competition.sourceMode??"existing").replace(/\+sprint5-quality-hardening/g,"")}+sprint5-quality-hardening`;
  results.push({id:competition.id,clubs:competition.clubs.length,players,partialClubs});
}

source=source.slice(0,parsed.jsonStart)+JSON.stringify(parsed.competitions)+source.slice(parsed.end);
await writeFile(STATE_FILE,source);

const shortClubs=results.flatMap((row)=>row.partialClubs.map((club)=>`${row.id}:${club}`));
console.log(`SPRINT5 competitions=${results.length} clubs=${globalClubIds.size} refreshed=${refreshedClubs} removedSuspicious=${removedSuspicious} removedDuplicatePlayers=${removedDuplicatePlayers} repairedCrests=${repairedCrests} shortRosters=${shortClubs.length}`);
for(const row of results) if(row.partialClubs.length) console.log(`PARTIAL ${row.id}: ${row.partialClubs.join(", ")}`);
if(shortClubs.length) console.log(`SOURCE_LIMITED ${shortClubs.join(" | ")}`);
