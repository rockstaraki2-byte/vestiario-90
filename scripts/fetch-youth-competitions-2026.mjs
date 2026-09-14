import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE="https://tmapi-alpha.transfermarkt.technology";
const FILE="src/data/world-2026/youth-competitions.generated.ts";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0 (Vestiario90 youth sync)"};
const POS={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const SPECS=[
 {id:"ENGU21",tm:"GB21",name:"Premier League 2",country:"Inglaterra",level:"U21",expected:26},
 {id:"ENGU18",tm:"GB18",name:"U18 Premier League",country:"Inglaterra",level:"U18",expected:26},
 {id:"ITAU20",tm:"IJ1",name:"Primavera 1",country:"Itália",level:"U20",expected:20},
 {id:"USADEV",tm:"MNP3",name:"MLS NEXT Pro",country:"Estados Unidos",level:"Desenvolvimento",expected:30},
 {id:"RUSU17",tm:"Y047",name:"Youth Football League U17",country:"Rússia",level:"U17",expected:16},
 {id:"RUSU16",tm:"Y246",name:"Youth Football League U16",country:"Rússia",level:"U16",expected:16}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uniq=values=>[...new Set(values.map(String).filter(Boolean))];
const clean=x=>String(x??"").trim().replace(/\s+/g," ");
function todaySaoPaulo(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const v=t=>p.find(x=>x.type===t)?.value;return `${v("year")}-${v("month")}-${v("day")}`;}
async function api(path,attempt=1){try{const r=await fetch(`${BASE}/${path}`,{headers});const t=await r.text();if(!r.ok)throw new Error(`${path}: ${r.status} ${t.slice(0,140)}`);return JSON.parse(t)}catch(e){if(attempt>=4)throw e;await sleep(450*attempt);return api(path,attempt+1)}}
function tableIds(d){return uniq((d?.data?.tables??[]).flatMap(t=>t?.clubs??[]).map(c=>c?.clubId??c?.id))}
function clubIds(d){const rows=Array.isArray(d?.data)?d.data:(d?.data?.clubs??d?.clubs??[]);return uniq((rows??[]).map(c=>c?.clubId??c?.id??c?.club?.id))}
async function competitionIds(spec){
 const attempts=[[`competition/${spec.tm}/table`,tableIds],[`competition/${spec.tm}/club`,clubIds],[`competition/${spec.tm}/clubs`,clubIds]];
 const errors=[];
 for(const [path,parse] of attempts){try{const ids=parse(await api(path));if(ids.length>=Math.max(10,Math.floor(spec.expected*.55)))return{ids,source:path};errors.push(`${path}: ${ids.length} clubs`)}catch(e){errors.push(String(e))}}
 throw new Error(errors.join(" | "));
}
async function resolveClubs(ids){const found=new Map();for(let i=0;i<ids.length;i+=20){const chunk=ids.slice(i,i+20),q=chunk.map(id=>`ids[]=${encodeURIComponent(id)}`).join("&");try{for(const club of (await api(`clubs?${q}`))?.data??[])found.set(String(club.id),club)}catch{for(const id of chunk)try{const c=(await api(`clubs?ids[]=${encodeURIComponent(id)}`))?.data?.[0];if(c)found.set(String(c.id),c)}catch{}}}return ids.map(id=>found.get(String(id))).filter(Boolean)}
async function squad(id){return uniq(((await api(`club/${id}/squad`))?.data?.squad??[]).map(p=>p?.playerId))}
async function mapLimit(items,n,fn){const out=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(n,items.length)},worker));return out}
function player(p){const age=p?.lifeDates?.age;if(typeof age!=="number")return null;const raw=p?.marketValueDetails?.current?.value,value=typeof raw==="number"&&raw>0?raw:null;return{transfermarktId:String(p.id),name:clean(p.name),position:POS[p?.attributes?.position?.shortName]??"MC",age,marketValueEur:value,...(p?.marketValueDetails?.current?.determined&&value!==null?{marketValueUpdated:p.marketValueDetails.current.determined}:{})}}
async function build(spec){
 const{id:_,tm:__,expected:___,...publicSpec}=spec,{ids,source}=await competitionIds(spec),clubs=await resolveClubs(ids);if(clubs.length<10)throw new Error(`${spec.tm}: only ${clubs.length}/${ids.length} clubs resolved`);
 const squads=new Map,all=new Set,clubErrors=[];await mapLimit(clubs,5,async c=>{try{const ids=await squad(c.id);squads.set(String(c.id),ids);ids.forEach(id=>all.add(id))}catch(e){squads.set(String(c.id),[]);clubErrors.push({clubId:String(c.id),error:String(e)})}});
 const profiles=new Map,pids=[...all];for(let i=0;i<pids.length;i+=40){const q=pids.slice(i,i+40).map(id=>`ids[]=${encodeURIComponent(id)}`).join("&");try{for(const p of (await api(`players?${q}`))?.data??[])profiles.set(String(p.id),p)}catch(e){clubErrors.push({clubId:"profiles",error:`batch ${i}: ${String(e)}`})}}
 const rosters=clubs.map(c=>{const ps=(squads.get(String(c.id))??[]).map(id=>profiles.get(String(id))).filter(Boolean).map(player).filter(Boolean);return{sourceId:0,transfermarktId:Number(c.id),name:clean(c.name),shortName:clean(c.name).slice(0,14).toUpperCase(),imageUrl:`https://tmssl.akamaized.net/images/wappen/head/${c.id}.png`,marketValueEur:ps.reduce((s,p)=>s+(p.marketValueEur??0),0),players:ps}}),players=rosters.reduce((n,c)=>n+c.players.length,0);
 if(players<rosters.length*8)throw new Error(`${spec.id}: low player coverage ${players}/${rosters.length} clubs`);
 return{id:spec.id,tmCode:spec.tm,name:spec.name,country:spec.country,level:spec.level,season:spec.id.startsWith("RUS")||spec.id==="USADEV"?"2026":"2026/27",sourceMode:source,coverage:{clubs:rosters.length,players,partialClubs:rosters.filter(c=>c.players.length<10).map(c=>c.name),clubErrors},clubs:rosters};
}
function parsePrevious(source){const marker="export const YOUTH_WORLD_2026_COMPETITIONS:YouthWorldCompetitionRoster[]=";const start=source.indexOf(marker);if(start<0)return[];const jsonStart=start+marker.length,end=source.indexOf(";",jsonStart);if(end<0)return[];try{return JSON.parse(source.slice(jsonStart,end))}catch{return[]}}
let previous=[];try{previous=parsePrevious(await readFile(FILE,"utf8"))}catch{}
const previousById=new Map(previous.map(x=>[x.id,x])),built=[],errors=[];let refreshed=0,preserved=0;
for(const spec of SPECS){try{const x=await build(spec);built.push(x);refreshed++;console.log("OK",x.id,x.clubs.length,x.coverage.players,x.sourceMode)}catch(e){const prior=previousById.get(spec.id);if(prior?.clubs?.length>=10){built.push({...prior,sourceMode:`${prior.sourceMode??"previous"}+preserved`});preserved++;console.warn("PRESERVE",spec.id,String(e))}else console.error("SKIP",spec.id,String(e));errors.push({id:spec.id,tmCode:spec.tm,name:spec.name,error:String(e),preserved:Boolean(prior?.clubs?.length>=10)})}}
const union=SPECS.map(s=>JSON.stringify(s.id)).join("|");const output=[];output.push('import type { EuropeClubRoster } from "../europe-2026/top-leagues";');output.push(`export type YouthWorldCompetitionId=${union};`);output.push('export type YouthWorldCompetitionRoster={id:YouthWorldCompetitionId;tmCode:string;name:string;country:string;level:string;season:string;sourceMode?:string;coverage?:{clubs:number;players:number;partialClubs:string[];clubErrors:Array<{clubId:string;error:string}>};clubs:EuropeClubRoster[]};');output.push(`export const YOUTH_WORLD_2026_META=${JSON.stringify({snapshot:todaySaoPaulo(),requested:SPECS.length,imported:built.length,refreshed,preserved})} as const;`);output.push(`export const YOUTH_WORLD_2026_COMPETITIONS:YouthWorldCompetitionRoster[]=${JSON.stringify(built)};`);output.push(`export const YOUTH_WORLD_2026_SYNC_ERRORS=${JSON.stringify(errors)} as const;`);await mkdir("src/data/world-2026",{recursive:true});await writeFile(FILE,output.join("\n")+"\n");console.log("DONE",built.length,"/",SPECS.length,"competitions; errors",errors.length);
