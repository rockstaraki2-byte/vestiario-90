import{mkdir,writeFile}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology";
const WEBSITE="https://www.transfermarkt.com";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0 (Vestiario90 sync)"};
const siteHeaders={Accept:"text/html,application/xhtml+xml","Accept-Language":"en-US,en;q=0.9","User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36"};
const POSITION={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const SPECS=[
{id:"ENG2",codes:["GB2"],minClubs:20},{id:"ENG3",codes:["GB3"],minClubs:20},{id:"ENG4",codes:["GB4"],minClubs:20},
{id:"ESP2",codes:["ES2"],minClubs:18},{id:"ESP3",codes:["E3G1","E3G2"],minClubs:35},{id:"ESP4",codes:["E4G1","E4G2","E4G3","E4G4","E4G5"],minClubs:70},
{id:"FRA2",codes:["FR2"],minClubs:16},{id:"FRA3",codes:["FR3"],minClubs:16},{id:"FRA4",codes:["FR5A","FR5B","FR5C"],minClubs:40}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,attempt=1){try{const r=await fetch(`${BASE}/${path}`,{headers}),text=await r.text();if(!r.ok)throw new Error(`${path} ${r.status} ${text.slice(0,120)}`);return JSON.parse(text)}catch(e){if(attempt>=4)throw e;await sleep(450*attempt);return api(path,attempt+1)}}
const uniq=xs=>[...new Set(xs.map(String).filter(Boolean))];
function idsFromTable(d){return uniq((d?.data?.tables??[]).flatMap(t=>t?.clubs??[]).map(c=>c?.clubId??c?.id))}
function idsFromClubList(d){const rows=Array.isArray(d?.data)?d.data:(d?.data?.clubs??d?.clubs??[]);return uniq((rows??[]).map(c=>c?.clubId??c?.id??c?.club?.id))}
async function idsFromPublicPage(code){try{const url=`${WEBSITE}/x/startseite/wettbewerb/${code}/saison_id/2026`,r=await fetch(url,{headers:siteHeaders,redirect:"follow"});if(!r.ok)throw new Error(`HTTP ${r.status}`);const html=await r.text(),table=html.match(/<table[^>]*class="[^"]*items[^"]*"[^>]*>[\s\S]*?<\/table>/i)?.[0]??"",ids=uniq([...table.matchAll(/\/verein\/(\d+)/g)].map(m=>m[1]));if(ids.length)console.log("html fallback",code,ids.length);return ids}catch(e){console.warn("html failed",code,String(e));return[]}}
async function idsForCode(code){try{const ids=idsFromTable(await api(`competition/${code}/table`));if(ids.length)return ids}catch(e){console.warn("table fallback",code,String(e))}try{const ids=idsFromClubList(await api(`competition/${code}/clubs`));if(ids.length)return ids}catch(e){console.warn("clubs failed",code,String(e))}return idsFromPublicPage(code)}
async function clubIds(codes){const all=new Set();for(const code of codes)for(const id of await idsForCode(code))all.add(id);return[...all]}
async function resolveClubs(ids){const out=[];for(let i=0;i<ids.length;i+=20){const qs=ids.slice(i,i+20).map(id=>`ids[]=${id}`).join("&");out.push(...((await api(`clubs?${qs}`))?.data??[]))}return out}
async function squadIds(id){return uniq(((await api(`club/${id}/squad`))?.data?.squad??[]).map(x=>x?.playerId))}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out}
const clean=v=>String(v??"").trim().replace(/\s+/g," ");
const short=name=>{const s=clean(name).replace(/\b(FC|AFC|CF|RC|SC|EC|AC|AS|Club|Clube)\b/gi,"").trim();return(s.length<=14?s:s.split(" ").map(w=>w[0]).join("")).toUpperCase().slice(0,14)};
function playerRow(p){const age=p?.lifeDates?.age;if(typeof age!=="number")return null;const raw=p?.marketValueDetails?.current?.value,value=typeof raw==="number"&&raw>0?raw:null;return{transfermarktId:String(p.id),name:clean(p.name),position:POSITION[p?.attributes?.position?.shortName]??"MC",age,marketValueEur:value,...(p?.marketValueDetails?.current?.determined&&value!==null?{marketValueUpdated:p.marketValueDetails.current.determined}:{})}}
async function build(spec){const ids=await clubIds(spec.codes);if(ids.length<spec.minClubs)throw new Error(`${spec.id}: only ${ids.length} clubs`);const clubs=await resolveClubs(ids),squads=new Map(),all=new Set();await mapLimit(clubs,5,async c=>{try{const s=await squadIds(c.id);squads.set(String(c.id),s);s.forEach(id=>all.add(id))}catch(e){console.warn("squad failed",spec.id,c.id,String(e))}});const profiles=new Map(),pids=[...all];for(let i=0;i<pids.length;i+=40){const qs=pids.slice(i,i+40).map(id=>`ids[]=${id}`).join("&"),d=await api(`players?${qs}`);for(const p of d?.data??[])profiles.set(String(p.id),p)}const rosters=clubs.map(c=>{const players=(squads.get(String(c.id))??[]).map(id=>profiles.get(id)).filter(Boolean).map(playerRow).filter(Boolean);return{sourceId:0,transfermarktId:Number(c.id),name:clean(c.name),shortName:short(c.name),imageUrl:`https://tmssl.akamaized.net/images/wappen/head/${c.id}.png`,marketValueEur:players.reduce((s,p)=>s+(p.marketValueEur??0),0),players}}).filter(c=>c.players.length>=15);if(rosters.length<spec.minClubs)throw new Error(`${spec.id}: only ${rosters.length} complete rosters`);return{competitionId:spec.id,clubs:rosters}}
const built=[],errors=[];for(const spec of SPECS){try{const x=await build(spec);built.push(x);console.log("OK",spec.id,x.clubs.length,x.clubs.reduce((n,c)=>n+c.players.length,0))}catch(e){errors.push({competitionId:spec.id,error:String(e)});console.error("SKIP",spec.id,String(e))}}
if(!built.length)throw new Error("No lower-league roster imported");
await mkdir("src/data/europe-2026",{recursive:true});
const out=['import type { EuropeClubRoster } from "./top-leagues";','export type RealLowerRosterSnapshot={competitionId:string;clubs:EuropeClubRoster[]};',`export const REAL_LOWER_ROSTERS:RealLowerRosterSnapshot[]=${JSON.stringify(built)};`,`export const REAL_LOWER_ROSTER_SYNC_ERRORS=${JSON.stringify(errors)} as const;`];
await writeFile("src/data/europe-2026/real-lower-rosters.generated.ts",out.join("\n")+"\n");
console.log("done",built.map(x=>x.competitionId).join(","));
