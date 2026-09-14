import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://tmapi-alpha.transfermarkt.technology";
const STATE_FILE = "src/data/world-2026/state-competitions.generated.ts";
const TARGET_COMPETITIONS = new Set(["SPA1","CEA1","ESA1","RNA1"]);
const headers = { Accept:"application/json", "Accept-Language":"pt-BR", "User-Agent":"Mozilla/5.0 (Vestiario90 sprint4 quality refresh)" };
const siteHeaders = {
  Accept:"text/html,application/xhtml+xml,*/*",
  "Accept-Language":"pt-BR,pt;q=0.9,en;q=0.7",
  "Cache-Control":"no-cache",
  Referer:"https://www.transfermarkt.com.br/",
  "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
};
const POS = { GOL:"GOL", ZAG:"ZAG", LD:"LD", LE:"LE", VOL:"VOL", MC:"MC", MEI:"MEI", PD:"PD", PE:"PE", CA:"ATA", SA:"ATA", MD:"PD" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? "").trim().replace(/\s+/g," ");
const norm = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const suspiciousNames = new Set(["pendencia","pendencias","pending","unknown","desconhecido","n a","null","undefined",""]);
const validPlayerName = (name) => !suspiciousNames.has(norm(name)) && norm(name) !== "-";

async function api(path, attempt=1) {
  try {
    const response = await fetch(`${BASE}/${path}`, {headers});
    const text = await response.text();
    if (!response.ok) throw new Error(`${path} ${response.status} ${text.slice(0,120)}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(350 * attempt);
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
  return {marker,jsonStart,end,competitions:JSON.parse(source.slice(jsonStart,end))};
}
function mapPlayer(profile) {
  const age = profile?.lifeDates?.age;
  const name = clean(profile?.name);
  if (typeof age !== "number" || !validPlayerName(name)) return null;
  const raw = profile?.marketValueDetails?.current?.value;
  const marketValueEur = typeof raw === "number" && raw > 0 ? raw : null;
  return {
    transfermarktId:String(profile.id),name,
    position:POS[profile?.attributes?.position?.shortName]??"MC",age,marketValueEur,
    ...(profile?.marketValueDetails?.current?.determined&&marketValueEur!==null?{marketValueUpdated:profile.marketValueDetails.current.determined}:{})
  };
}
async function profilesForIds(playerIds) {
  const profiles=[];
  for (let index=0; index<playerIds.length; index+=40) {
    const query=playerIds.slice(index,index+40).map((id)=>`ids[]=${encodeURIComponent(id)}`).join("&");
    const data=(await api(`players?${query}`))?.data??[];
    profiles.push(...data);
  }
  return profiles.map(mapPlayer).filter(Boolean);
}
function playerIdsFromSquadHtml(html) {
  const table = html.match(/<table[^>]*class=["'][^"']*items[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0] ?? html;
  const ids = [...table.matchAll(/\/spieler\/(\d+)/g)].map((match)=>String(match[1]));
  return [...new Set(ids)];
}
async function publicSquadPlayerIds(clubId) {
  const domains=["https://www.transfermarkt.com.br","https://www.transfermarkt.com","https://www.transfermarkt.co.uk"];
  const paths=[`/x/kader/verein/${clubId}/saison_id/2025`,`/x/kader/verein/${clubId}`];
  for(const domain of domains) for(const path of paths) {
    try {
      const response=await fetch(`${domain}${path}`,{headers:siteHeaders,redirect:"follow"});
      if(!response.ok) continue;
      const ids=playerIdsFromSquadHtml(await response.text());
      if(ids.length>=8) return ids;
    } catch {}
  }
  return [];
}
async function freshRoster(clubId) {
  const apiIds = [...new Set(((await api(`club/${clubId}/squad`))?.data?.squad??[]).map((item)=>String(item?.playerId??"")).filter(Boolean))];
  const apiRoster = await profilesForIds(apiIds);
  if(apiRoster.length>=8) return {players:apiRoster,source:"tmapi-squad"};
  const publicIds=await publicSquadPlayerIds(clubId);
  if(publicIds.length) {
    const publicRoster=await profilesForIds(publicIds);
    if(publicRoster.length>apiRoster.length) return {players:publicRoster,source:"transfermarkt-public-squad"};
  }
  return {players:apiRoster,source:"tmapi-squad-partial"};
}

let source = await readFile(STATE_FILE,"utf8");
const parsed = parseCompetitions(source);
const results=[];
for (const competition of parsed.competitions) {
  if (!TARGET_COMPETITIONS.has(competition.id)) continue;
  let refreshed=0,kept=0,publicFallbacks=0,removedSuspicious=0;
  const clubErrors=[];
  for (const club of competition.clubs) {
    const cleanedExisting=(club.players??[]).filter((player)=>{
      const valid=validPlayerName(player?.name);
      if(!valid) removedSuspicious++;
      return valid;
    });
    try {
      const freshResult=await freshRoster(club.transfermarktId);
      const fresh=freshResult.players;
      if (fresh.length >= 8) {
        club.players=fresh;
        club.marketValueEur=fresh.reduce((sum,item)=>sum+(item.marketValueEur??0),0);
        refreshed++;
        if(freshResult.source==="transfermarkt-public-squad") publicFallbacks++;
      } else {
        club.players=cleanedExisting.length>=fresh.length?cleanedExisting:fresh;
        club.marketValueEur=club.players.reduce((sum,item)=>sum+(item.marketValueEur??0),0);
        kept++;
        clubErrors.push({clubId:String(club.transfermarktId),error:`fresh roster below threshold (${fresh.length}; ${freshResult.source})`});
      }
    } catch(error) {
      club.players=cleanedExisting;
      club.marketValueEur=cleanedExisting.reduce((sum,item)=>sum+(item.marketValueEur??0),0);
      kept++;
      clubErrors.push({clubId:String(club.transfermarktId),error:String(error)});
    }
  }
  const players=competition.clubs.reduce((sum,club)=>sum+(club.players?.length??0),0);
  const partialClubs=competition.clubs.filter((club)=>(club.players?.length??0)<10).map((club)=>club.name);
  competition.coverage={clubs:competition.clubs.length,players,partialClubs,clubErrors};
  competition.sourceMode=`${String(competition.sourceMode??"existing").replace(/\+sprint4-quality-refresh/g,"")}+sprint4-quality-refresh`;
  results.push({id:competition.id,clubs:competition.clubs.length,players,partialClubs,refreshed,kept,publicFallbacks,removedSuspicious});
}
source=source.slice(0,parsed.jsonStart)+JSON.stringify(parsed.competitions)+source.slice(parsed.end);
await writeFile(STATE_FILE,source);
for(const result of results) console.log("QUALITY",JSON.stringify(result));
if(results.length!==TARGET_COMPETITIONS.size) throw new Error(`Expected ${TARGET_COMPETITIONS.size} quality targets, refreshed ${results.length}`);
