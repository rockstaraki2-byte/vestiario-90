import{mkdir,writeFile}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
const POSITION={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const SPECS=[
 {id:"ENG1",tm:"GB1",name:"Premier League",shortName:"Premier League",country:"Inglaterra",startDate:"2026-08-21",expectedClubs:20,benchSize:9,maxSubstitutions:5},
 {id:"ESP1",tm:"ES1",name:"LALIGA EA SPORTS",shortName:"LaLiga",country:"Espanha",startDate:"2026-08-15",expectedClubs:20,benchSize:12,maxSubstitutions:5},
 {id:"FRA1",tm:"FR1",name:"Ligue 1 McDonald's",shortName:"Ligue 1",country:"França",startDate:"2026-08-21",expectedClubs:18,benchSize:9,maxSubstitutions:5},
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,attempt=1){try{const r=await fetch(`${BASE}/${path}`,{headers});const text=await r.text();if(!r.ok)throw new Error(`${r.status} ${text.slice(0,180)}`);return JSON.parse(text);}catch(error){if(attempt>=5)throw new Error(`${path}: ${error}`);await sleep(400*attempt);return api(path,attempt+1);}}
function tableIds(data){return[...new Set((data?.data?.tables??[]).flatMap(t=>t.clubs??[]).map(c=>String(c.clubId)))];}
async function resolveClubs(ids){const out=[];for(let i=0;i<ids.length;i+=20){const qs=ids.slice(i,i+20).map(id=>`ids[]=${id}`).join("&");out.push(...((await api(`clubs?${qs}`))?.data??[]));await sleep(40);}return out;}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;}
const cleanName=name=>String(name??"").trim().replace(/\s+/g," ");
function shortName(name){const clean=cleanName(name).replace(/\b(FC|AFC|CF|RC|SC|AS|AC|OGC|LOSC|Olympique|Stade)\b/gi,"").trim();if(clean.length<=14)return clean.toUpperCase();const words=clean.split(" ").filter(Boolean);return words.slice(0,3).map(w=>w[0]).join("").toUpperCase();}
const crest=id=>`https://tmssl.akamaized.net/images/wappen/head/${id}.png`;
async function competition(spec){const table=await api(`competition/${spec.tm}/table`),ids=tableIds(table),clubs=await resolveClubs(ids);if(clubs.length!==spec.expectedClubs)throw new Error(`${spec.tm} esperava ${spec.expectedClubs} clubes, recebeu ${clubs.length}`);return clubs;}
async function squadIds(club){const data=await api(`club/${club.id}/squad`);return(data?.data?.squad??[]).map(p=>String(p.playerId)).filter(Boolean);}
function playerRow(player){const raw=player?.marketValueDetails?.current?.value,value=typeof raw==="number"&&raw>0?raw:null,age=player?.lifeDates?.age;if(typeof age!=="number")return null;const position=POSITION[player?.attributes?.position?.shortName]??"MC",updated=player?.marketValueDetails?.current?.determined;return{transfermarktId:String(player.id),name:cleanName(player.name),position,age,marketValueEur:value,...(updated&&value!==null?{marketValueUpdated:updated}:{})};}
async function buildRosters(clubs){const squadMap=new Map(),all=new Set();await mapLimit(clubs,6,async club=>{const ids=await squadIds(club);squadMap.set(String(club.id),ids);for(const id of ids)all.add(id);console.log("squad",club.name,ids.length);});const profiles=new Map(),ids=[...all];for(let i=0;i<ids.length;i+=40){const chunk=ids.slice(i,i+40),qs=chunk.map(id=>`ids[]=${id}`).join("&"),data=await api(`players?${qs}`);for(const p of data?.data??[])profiles.set(String(p.id),p);if(i%400===0)console.log("profiles",i,"/",ids.length);await sleep(40);}return clubs.map(club=>{const players=(squadMap.get(String(club.id))??[]).map(id=>profiles.get(id)).filter(Boolean).map(playerRow).filter(Boolean);return{sourceId:0,transfermarktId:Number(club.id),name:cleanName(club.name),shortName:shortName(club.name),imageUrl:crest(club.id),marketValueEur:players.reduce((s,p)=>s+(p.marketValueEur??0),0),players};});}
const snapshots=[];
for(const spec of SPECS){const clubs=await competition(spec),rosters=await buildRosters(clubs),playerCount=rosters.reduce((n,c)=>n+c.players.length,0);if(playerCount<spec.expectedClubs*20)throw new Error(`${spec.id}: cobertura baixa, ${playerCount} jogadores`);snapshots.push({...spec,clubs:rosters});console.log("competition",spec.id,rosters.length,playerCount);}
const counts=Object.fromEntries(snapshots.map(s=>[s.id,{clubs:s.clubs.length,players:s.clubs.reduce((n,c)=>n+c.players.length,0)}]));
const out=[];
out.push('export type EuropeCompetitionId="ENG1"|"ESP1"|"FRA1";');
out.push('export type EuropeRosterPosition="GOL"|"LD"|"LE"|"ZAG"|"VOL"|"MC"|"MEI"|"PD"|"PE"|"ATA";');
out.push('export type EuropeRosterPlayer={transfermarktId:string;name:string;position:EuropeRosterPosition;age:number;marketValueEur:number|null;marketValueUpdated?:string};');
out.push('export type EuropeClubRoster={sourceId:number;transfermarktId:number;name:string;shortName:string;imageUrl:string;marketValueEur:number;players:EuropeRosterPlayer[]};');
out.push('export type EuropeCompetitionRoster={id:EuropeCompetitionId;tmCode:string;name:string;shortName:string;country:string;season:2026;startDate:string;roundCadenceDays:number;doubleRoundRobin:true;benchSize:number;maxSubstitutions:number;clubs:EuropeClubRoster[]};');
out.push(`export const EUROPE_2026_META=${JSON.stringify({snapshot:"2026-09-06",source:"Transfermarkt competition/squad snapshot, participantes conferidos em fontes oficiais das ligas",counts})} as const;`);
out.push(`export const EUROPE_2026_COMPETITIONS:EuropeCompetitionRoster[]=${JSON.stringify(snapshots.map(s=>({id:s.id,tmCode:s.tm,name:s.name,shortName:s.shortName,country:s.country,season:2026,startDate:s.startDate,roundCadenceDays:7,doubleRoundRobin:true,benchSize:s.benchSize,maxSubstitutions:s.maxSubstitutions,clubs:s.clubs})))};`);
await mkdir("src/data/europe-2026",{recursive:true});await writeFile("src/data/europe-2026/top-leagues.ts",out.join("\n")+"\n");await writeFile("europe-2026-snapshot.json",JSON.stringify({snapshot:new Date().toISOString(),counts,competitions:snapshots.map(s=>({id:s.id,tmCode:s.tm,clubs:s.clubs.map(c=>({id:c.transfermarktId,name:c.name,squad:c.players.length}))}))},null,2));console.log("DONE",JSON.stringify(counts));
