import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE = "https://tmapi-alpha.transfermarkt.technology";
const STATE_FILE = "src/data/world-2026/state-competitions.generated.ts";
const TRANSFERMARKT_DOMAINS = ["https://www.transfermarkt.com.br","https://www.transfermarkt.com","https://www.transfermarkt.co.uk","https://www.transfermarkt.de"];
const SEARCH_DOMAINS = ["https://www.transfermarkt.co.uk","https://www.transfermarkt.com","https://www.transfermarkt.com.br"];
const headers = { Accept:"application/json", "Accept-Language":"pt-BR", "User-Agent":"Mozilla/5.0 (Vestiario90 state sync v2)" };
const siteHeaders = {
  Accept:"text/html,application/xhtml+xml,application/json,text/plain,*/*",
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

// Participant names verified against 2026 federation/regulation pages and current competition pages.
// These are search queries, not invented roster data: squads are always fetched live after the club is resolved.
const VERIFIED_NAMES_2026 = {
  BRCM:["Cruzeiro EC","Atlético Mineiro","Athletic Club MG","América Mineiro","Pouso Alegre FC","Betim Futebol","Uberlândia EC","Democrata GV","North EC MG","Tombense FC","URT-MG","Itabirito FC"],
  BRRS:["Grêmio FBPA","SC Internacional","EC Juventude","SER Caxias do Sul","EC Internacional de Santa Maria","EC São José RS","EC Novo Hamburgo","EC Avenida","Ypiranga FC Erechim","Guarany de Bagé FC","EC São Luiz Ijuí","Monsoon FC"],
  BRPR:["Athletico Paranaense","Coritiba FC","Operário FEC","Londrina EC","Cianorte FC","Clube Andraus Brasil","FC Cascavel","Maringá FC","Foz do Iguaçu FC","IF São Joseense","Azuriz FC","Galo Maringá"],
  BRCB:["EC Bahia","EC Vitória","Porto SC BA","Alagoinhas AC","EC Jacuipense","AD Bahia de Feira","SD Juazeirense","Galícia EC","AD Jequié","Barcelona de Ilhéus FC"],
  BRPE:["Sport Recife","Náutico","AA Maguary","Santa Cruz FC PE","AAD Vitória das Tabocas","Decisão FC","Retrô FC Brasil","AD Jaguar PE"],
  BRGO:["Goiás EC","Vila Nova FC","Atlético Goianiense","Anápolis FC","Goiatuba EC","CRAC Catalão","AA Anapolina","AA Aparecidense","AE Jataiense","Inhumas EC","Centro Oeste FC GO","ABECAT Ouvidorense"],
  BRPA:["Clube do Remo PA","Paysandu SC","Castanhal EC","Tuna Luso Brasileira","Águia de Marabá FC","São Raimundo EC PA","Cametá SC","São Francisco FC PA","Bragantino Clube do Pará","Amazônia Independente FC","Santa Rosa EC PA","Capitão Poço EC"],
  BRAL:["ASA de Arapiraca","AA Coruripe","CSA","CRB","CSE","SC Penedense","EC Cruzeiro Arapiraca","Murici Sport Clube"],
  BRSE:["América FC Propriá","Atlético Gloriense","AD Confiança","Desportiva Aracaju","Dorense FC","Falcon FC SE","Guarany-SE","AO Itabaiana","Lagarto FC","CS Sergipe"],
  BRMA:["Sampaio Corrêa FC","Moto Club","Imperatriz-MA","Maranhão AC","ITZ Sport","IAPE FC","Tuntum EC","Luminense AC"],
  BRPI:["Parnahyba SC","AA Altos","Piauí EC","Fluminense EC PI","AA Oeirense","AA Corisabbá","CA Piauiense","Teresina Esporte Clube"],
  BRAM:["Amazonas FC","Itacoatiara FC AM","Manauara EC","Manaus FC","Nacional FC AM","Parintins FC","Princesa do Solimões EC","São Raimundo EC AM"],
  BRAC:["Galvez EC","AD Vasco da Gama AC","Rio Branco FC AC","AD Senador Guiomard","Independência FC AC","SC Humaitá","São Francisco FC AC","Santa Cruz Acre EC"],
  BRAP:["Clube Atlético Cristal AP","Independente EC AP","EC Macapá","Oratório RC","Santos FC AP","SER São José AP","Trem DC","Ypiranga Clube AP"],
  BRRR:["Atlético Roraima Clube","Baré EC","GA Sampaio RR","Monte Roraima FC","Náutico RR","Progresso RR","Rio Negro RR","River EC RR","São Raimundo RR"],
  BRRD:["Barcelona FC RO","Porto Velho EC","Genus RO","Guaporé FC RO","Ji-Paraná FC","Rondoniense Social Clube","União Cacoalense"],
  BRTO:["Araguaína FR","Bela Vista Futebol Cachoeirense","Capital FC TO","Sport Club Guaraí","Gurupi EC","Palmas FR","Tocantinópolis EC","União Atlético Clube TO"],
  BRDF:["Ceilândia EC","SE Gama","Sobradinho EC","Brasiliense FC","ARUC","Brasília FC DF","Capital CF DF","Paranoá EC","Samambaia FC","Real Brasília FC"],
  BRMT:["Ivinhema FC","Corumbaense FC","EC Águia Negra MS","Operário FC MS","Clube Esportivo Naviraiense MS","Costa Rica EC MS","Dourados AC","FC Pantanal MS","CR Aquidauana","Associação Atlética Bataguassu"],
};

const NEVER_PRESERVE = new Set(["RSA1","BAA1","PAA1"]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uniq = (values) => [...new Set(values.map(String).filter(Boolean))];
const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const norm = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
function tableIds(data) { return uniq((data?.data?.tables ?? []).flatMap((table) => table?.clubs ?? []).map((club) => club?.clubId ?? club?.id)); }
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
function searchCandidates(value) {
  const out = [];
  const visit = (item) => {
    if (!item) return;
    if (Array.isArray(item)) return item.forEach(visit);
    if (typeof item !== "object") return;
    const id = item.clubId ?? item.teamId ?? item?.club?.id ?? item?.team?.id ?? item.id;
    const name = item.name ?? item.label ?? item.title ?? item?.club?.name ?? item?.team?.name;
    if (id && name && /^\d+$/.test(String(id))) out.push({ id:String(id), name:clean(String(name).replace(/<[^>]+>/g," ")) });
    Object.values(item).forEach(visit);
  };
  visit(value);
  return [...new Map(out.map((item) => [item.id,item])).values()];
}
function scoreCandidate(query, candidate) {
  const q = norm(query), c = norm(candidate.name);
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  const qt = new Set(q.split(" ").filter((x) => x.length > 1));
  const ct = new Set(c.split(" ").filter((x) => x.length > 1));
  const common = [...qt].filter((x) => ct.has(x)).length;
  return common * 10 - Math.abs(qt.size - ct.size);
}
async function searchClubId(query) {
  for (const domain of SEARCH_DOMAINS) {
    try {
      const url = `${domain}/news/search?index=clubs_lang_new&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers:{...siteHeaders,Accept:"application/json,text/plain,*/*"}, redirect:"follow" });
      if (!response.ok) continue;
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { continue; }
      const candidates = searchCandidates(data).sort((a,b) => scoreCandidate(query,b) - scoreCandidate(query,a));
      if (candidates[0] && scoreCandidate(query,candidates[0]) >= 8) return candidates[0];
    } catch (error) { console.warn("team search failed", query, domain, String(error)); }
  }
  return null;
}
async function idsFromVerifiedNames(code) {
  const names = VERIFIED_NAMES_2026[code] ?? [];
  if (!names.length) return [];
  const hits = [];
  for (const name of names) {
    const hit = await searchClubId(name);
    if (hit) { hits.push(hit.id); console.log("name fallback", code, name, "=>", hit.id, hit.name); }
    else console.warn("name fallback miss", code, name);
    await sleep(80);
  }
  const ids = uniq(hits);
  const minimum = Math.max(6, Math.ceil(names.length * 0.72));
  if (ids.length < minimum) throw new Error(`${code}: verified-name resolver returned ${ids.length}/${names.length}, minimum ${minimum}`);
  return ids;
}
async function idsFromQuickselect(code) {
  const paths = [`/quickselect/teams/${code}`, `/quickselect/teams/${code}/saison_id/2026`, `/quickselect/teams/${code}/saison_id/2025`];
  for (const domain of TRANSFERMARKT_DOMAINS) for (const path of paths) {
    try {
      const response = await fetch(`${domain}${path}`, { headers:{...siteHeaders,Accept:"application/json,text/plain,*/*"}, redirect:"follow" });
      if (!response.ok) continue;
      const text = await response.text(); let parsed; try { parsed=JSON.parse(text); } catch { continue; }
      const ids = idsFromJson(parsed); if (ids.length >= 6) return ids;
    } catch {}
  }
  return [];
}
function idsFromHtml(html) {
  const table = html.match(/<table[^>]*class=["'][^"']*items[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0] ?? html;
  const patterns=[/\/verein\/(\d+)/g,/\/startseite\/verein\/(\d+)/g,/\/kader\/verein\/(\d+)/g,/data-verein-id=["'](\d+)["']/g];
  return uniq(patterns.flatMap((pattern)=>[...table.matchAll(pattern)].map((match)=>match[1])));
}
async function idsFromPublicPage(code) {
  const paths=[`/x/teilnehmer/pokalwettbewerb/${code}`,`/x/teilnehmer/pokalwettbewerb/${code}/saison_id/2025`,`/x/startseite/pokalwettbewerb/${code}/saison_id/2025`,`/x/startseite/wettbewerb/${code}/saison_id/2025`];
  for (const domain of TRANSFERMARKT_DOMAINS) for (const path of paths) {
    try { const response=await fetch(`${domain}${path}`,{headers:siteHeaders,redirect:"follow"}); if(!response.ok)continue; const ids=idsFromHtml(await response.text()); if(ids.length>=6)return ids; } catch {}
  }
  return [];
}
async function competitionIds(code) {
  try { const ids=tableIds(await api(`competition/${code}/table`)); if(ids.length>=6)return {ids,source:"tmapi-table"}; } catch(error){ console.warn("table failed",code,String(error)); }
  try { const ids=clubListIds(await api(`competition/${code}/club`)); if(ids.length>=6)return {ids,source:"tmapi-club"}; } catch(error){ console.warn("club failed",code,String(error)); }
  try { const ids=clubListIds(await api(`competition/${code}/clubs`)); if(ids.length>=6)return {ids,source:"tmapi-clubs"}; } catch(error){ console.warn("clubs failed",code,String(error)); }
  const quick=await idsFromQuickselect(code); if(quick.length>=6)return {ids:quick,source:"transfermarkt-quickselect"};
  const publicIds=await idsFromPublicPage(code); if(publicIds.length>=6)return {ids:publicIds,source:"transfermarkt-public"};
  const named=await idsFromVerifiedNames(code); if(named.length>=6)return {ids:named,source:"verified-2026-name-search"};
  throw new Error(`${code}: no participant source returned at least 6 clubs`);
}
async function clubs(ids) {
  const found=new Map();
  for(let index=0;index<ids.length;index+=20){
    const chunk=ids.slice(index,index+20),query=chunk.map((id)=>`ids[]=${encodeURIComponent(id)}`).join("&");
    try { for(const club of (await api(`clubs?${query}`))?.data??[])found.set(String(club.id),club); }
    catch { for(const id of chunk) try { const club=(await api(`clubs?ids[]=${encodeURIComponent(id)}`))?.data?.[0]; if(club)found.set(String(club.id),club); } catch {} }
  }
  return ids.map((id)=>found.get(String(id))).filter(Boolean);
}
async function squad(id){ return uniq(((await api(`club/${id}/squad`))?.data?.squad??[]).map((item)=>item?.playerId)); }
async function mapLimit(items,limit,fn){ const output=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const index=cursor++;output[index]=await fn(items[index],index);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return output; }
function player(profile){
  const age=profile?.lifeDates?.age;if(typeof age!=="number")return null;
  const raw=profile?.marketValueDetails?.current?.value,marketValueEur=typeof raw==="number"&&raw>0?raw:null;
  return {transfermarktId:String(profile.id),name:clean(profile.name),position:POS[profile?.attributes?.position?.shortName]??"MC",age,marketValueEur,...(profile?.marketValueDetails?.current?.determined&&marketValueEur!==null?{marketValueUpdated:profile.marketValueDetails.current.determined}:{})};
}
async function build(spec){
  const [id,tmCode,name,state,tier]=spec,{ids,source}=await competitionIds(tmCode),resolvedClubs=await clubs(ids);
  if(resolvedClubs.length<6)throw new Error(`${tmCode}: only ${resolvedClubs.length}/${ids.length} resolved clubs`);
  const squads=new Map(),allPlayers=new Set(),clubErrors=[];
  await mapLimit(resolvedClubs,5,async(club)=>{try{const playerIds=await squad(club.id);squads.set(String(club.id),playerIds);playerIds.forEach((x)=>allPlayers.add(x));}catch(error){clubErrors.push({clubId:String(club.id),error:String(error)});squads.set(String(club.id),[]);}});
  const profiles=new Map(),playerIds=[...allPlayers];
  for(let index=0;index<playerIds.length;index+=40){const query=playerIds.slice(index,index+40).map((x)=>`ids[]=${encodeURIComponent(x)}`).join("&");try{for(const profile of (await api(`players?${query}`))?.data??[])profiles.set(String(profile.id),profile);}catch(error){clubErrors.push({clubId:"profiles",error:`batch ${index}: ${String(error)}`});}}
  const rosters=resolvedClubs.map((club)=>{const players=(squads.get(String(club.id))??[]).map((x)=>profiles.get(String(x))).filter(Boolean).map(player).filter(Boolean);return{sourceId:0,transfermarktId:Number(club.id),name:clean(club.name),shortName:short(club.name),imageUrl:`https://tmssl.akamaized.net/images/wappen/head/${club.id}.png`,marketValueEur:players.reduce((sum,item)=>sum+(item.marketValueEur??0),0),players};});
  const totalPlayers=rosters.reduce((count,club)=>count+club.players.length,0),partialClubs=rosters.filter((club)=>club.players.length<10).map((club)=>club.name);
  if(totalPlayers<resolvedClubs.length*8)throw new Error(`${tmCode}: roster coverage too low (${totalPlayers} players / ${resolvedClubs.length} clubs)`);
  return{id,tmCode,name,state,tier,season:2026,sourceMode:source,coverage:{clubs:rosters.length,players:totalPlayers,partialClubs,clubErrors},clubs:rosters};
}
function parsePrevious(source){const marker="export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=";const start=source.indexOf(marker);if(start<0)return[];const jsonStart=start+marker.length,end=source.indexOf(";",jsonStart);if(end<0)return[];try{return JSON.parse(source.slice(jsonStart,end));}catch{return[];}}
let previous=[];try{previous=parsePrevious(await readFile(STATE_FILE,"utf8"));}catch{}
const previousById=new Map(previous.map((competition)=>[competition.id,competition])),built=[],errors=[];let refreshed=0,preserved=0;
for(const spec of SPECS){
  try{const competition=await build(spec);built.push(competition);refreshed++;console.log("OK",competition.id,competition.clubs.length,competition.coverage.players,competition.sourceMode,"partial",competition.coverage.partialClubs.length);}
  catch(error){const fallback=previousById.get(spec[0]),canPreserve=!NEVER_PRESERVE.has(spec[0])&&fallback?.clubs?.length>=6;if(canPreserve){built.push({...fallback,sourceMode:`${fallback.sourceMode??"previous"}+preserved`});preserved++;console.warn("PRESERVE",spec[0],fallback.clubs.length,String(error));}else console.error("SKIP",spec[0],String(error));errors.push({id:spec[0],tmCode:spec[1],name:spec[2],state:spec[3],tier:spec[4],preserved:canPreserve,error:String(error)});}
}
if(!built.length)throw new Error("No Brazilian state championship imported or preserved");
built.sort((a,b)=>SPECS.findIndex((spec)=>spec[0]===a.id)-SPECS.findIndex((spec)=>spec[0]===b.id));
await mkdir("src/data/world-2026",{recursive:true});const snapshot=todaySaoPaulo();
const output=['import type { EuropeClubRoster } from "../europe-2026/top-leagues";','export type BrazilStateCompetitionRoster={id:string;tmCode:string;name:string;state:string;tier:"A1"|"A2"|"B";season:2026;sourceMode?:string;coverage?:{clubs:number;players:number;partialClubs:string[];clubErrors:Array<{clubId:string;error:string}>};clubs:EuropeClubRoster[]};',`export const BRAZIL_STATE_2026_META=${JSON.stringify({snapshot,requested:SPECS.length,imported:built.length,refreshed,preserved,source:"Transfermarkt API/public competition pages plus verified 2026 participant-name resolution; no stale numeric participant fallbacks"})} as const;`,`export const BRAZIL_STATE_2026_COMPETITIONS:BrazilStateCompetitionRoster[]=${JSON.stringify(built)};`,`export const BRAZIL_STATE_2026_SYNC_ERRORS=${JSON.stringify(errors)} as const;`,""];
await writeFile(STATE_FILE,output.join("\n"));console.log("DONE",built.length,"available /",refreshed,"refreshed /",preserved,"preserved /",errors.length,"source errors");
