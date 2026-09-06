import{mkdir,writeFile}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
const POSITION={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,attempt=1){
 try{
  const r=await fetch(`${BASE}/${path}`,{headers});const text=await r.text();
  if(!r.ok)throw new Error(`${r.status} ${text.slice(0,180)}`);
  return JSON.parse(text);
 }catch(error){if(attempt>=4)throw new Error(`${path}: ${error}`);await sleep(350*attempt);return api(path,attempt+1);}
}
function tableIds(data){return[...new Set((data?.data?.tables??[]).flatMap(t=>t.clubs??[]).map(c=>String(c.clubId)))];}
async function resolveClubs(ids){const out=[];for(let i=0;i<ids.length;i+=20){const qs=ids.slice(i,i+20).map(id=>`ids[]=${id}`).join("&");out.push(...((await api(`clubs?${qs}`))?.data??[]));}return out;}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;}
function cleanName(name){return String(name??"").trim().replace(/\s+/g," ");}
function normalize(name){return cleanName(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\bu20\b/g,"").replace(/[^a-z0-9]/g,"");}
function shortName(name){const clean=cleanName(name).replace(/\s+U20.*$/i,"").replace(/\b(EC|FC|SC|SAF|FR|FBPA|AC|AA|CR|SE|AD|AO)\b/gi,"").trim();if(clean.length<=14)return clean.toUpperCase();const words=clean.split(" ").filter(Boolean);return words.slice(0,3).map(w=>w[0]).join("").toUpperCase();}
const crest=id=>`https://tmssl.akamaized.net/images/wappen/head/${id}.png`;
async function competition(code){const info=await api(`competition/${code}`),table=await api(`competition/${code}/table`),ids=tableIds(table),clubs=await resolveClubs(ids);return{code,info:info.data,clubs};}
async function squadIds(club){const data=await api(`club/${club.id}/squad`);return(data?.data?.squad??[]).map(p=>String(p.playerId)).filter(Boolean);}
function playerRow(player,youth){const raw=player?.marketValueDetails?.current?.value,value=typeof raw==="number"&&raw>0?raw:null,age=player?.lifeDates?.age;if(typeof age!=="number")return null;if(youth&&age>21)return null;const position=POSITION[player?.attributes?.position?.shortName]??"MC";const updated=player?.marketValueDetails?.current?.determined;return{transfermarktId:String(player.id),name:cleanName(player.name),position,age,marketValueEur:value,...(updated&&value!==null?{marketValueUpdated:updated}:{})};}
async function buildRosters(clubs,youth){
 const squadMap=new Map(),all=new Set();
 await mapLimit(clubs,6,async club=>{const ids=await squadIds(club);squadMap.set(String(club.id),ids);for(const id of ids)all.add(id);console.log("squad",club.name,ids.length);});
 const profiles=new Map(),ids=[...all];
 for(let i=0;i<ids.length;i+=40){const chunk=ids.slice(i,i+40),qs=chunk.map(id=>`ids[]=${id}`).join("&"),data=await api(`players?${qs}`);for(const p of data?.data??[])profiles.set(String(p.id),p);if(i%400===0)console.log("profiles",i,"/",ids.length);await sleep(35);}
 return clubs.map(club=>{
  const players=(squadMap.get(String(club.id))??[]).map(id=>profiles.get(id)).filter(Boolean).map(p=>playerRow(p,youth)).filter(Boolean);
  return{sourceId:0,transfermarktId:Number(club.id),name:cleanName(club.name),shortName:shortName(club.name),imageUrl:crest(club.id),marketValueEur:players.reduce((s,p)=>s+(p.marketValueEur??0),0),players};
 });
}
const serieB=await competition("BRA2"),serieC=await competition("BRA3"),copinha=await competition("SPjr");
if(serieB.clubs.length!==20)throw new Error(`BRA2 esperava 20 clubes, recebeu ${serieB.clubs.length}`);
if(serieC.clubs.length!==20)throw new Error(`BRA3 esperava 20 clubes, recebeu ${serieC.clubs.length}`);
if(copinha.clubs.length!==128)throw new Error(`SPjr esperava 128 clubes, recebeu ${copinha.clubs.length}`);
const [bRosters,cRosters,spRosters]=await Promise.all([buildRosters(serieB.clubs,false),buildRosters(serieC.clubs,false),buildRosters(copinha.clubs,true)]);
const aliases={
 "Avaí":"avai","Juventude":"juventude","Vitória":"vitoria","Botafogo":"botafogofr","Fluminense":"fluminense","Athletico-PR":"athleticoparanaense","Grêmio":"gremiofbpa","Fortaleza":"fortaleza","São Paulo":"saopaulo","Flamengo":"flamengo","Cruzeiro":"cruzeiro","Corinthians":"corinthians","Santos":"santos","Bahia":"bahia","Vasco":"vascodagama","Red Bull Bragantino":"redbullbragantino","Cuiabá":"cuiaba","Criciúma":"criciuma","Palmeiras":"palmeiras","América-MG":"americafc"
};
const spByNorm=new Map(spRosters.map(c=>[normalize(c.name),c]));
function findYouth(alias){const exact=[...spByNorm.entries()].find(([key])=>key.includes(alias));return exact?.[1];}
const cb20=[];for(const [display,alias]of Object.entries(aliases)){const found=findYouth(alias);if(!found)throw new Error(`CB20: não encontrei ${display} (${alias}) na Copinha`);cb20.push({...found,name:display,shortName:display.replace("Red Bull ","RBB ").slice(0,14).toUpperCase()});}
const snapshots=[
 {id:"BRA2",name:"Campeonato Brasileiro Série B",shortName:"Série B",kind:"professional",season:2026,clubs:bRosters},
 {id:"BRA3",name:"Campeonato Brasileiro Série C",shortName:"Série C",kind:"professional",season:2026,clubs:cRosters},
 {id:"CB20",name:"Campeonato Brasileiro Sub-20",shortName:"Brasileiro Sub-20",kind:"youth",season:2026,clubs:cb20},
 {id:"SPjr",name:"Copa São Paulo de Futebol Júnior",shortName:"Copinha",kind:"youth",season:2026,clubs:spRosters},
];
const counts=Object.fromEntries(snapshots.map(s=>[s.id,{clubs:s.clubs.length,players:s.clubs.reduce((n,c)=>n+c.players.length,0)}]));
const out=[];
out.push('export type ExpandedRosterPosition="GOL"|"LD"|"LE"|"ZAG"|"VOL"|"MC"|"MEI"|"PD"|"PE"|"ATA";');
out.push('export type ExpandedRosterPlayer={transfermarktId:string;name:string;position:ExpandedRosterPosition;age:number;marketValueEur:number|null;marketValueUpdated?:string};');
out.push('export type ExpandedClubRoster={sourceId:number;transfermarktId:number;name:string;shortName:string;imageUrl:string;marketValueEur:number;players:ExpandedRosterPlayer[]};');
out.push('export type ExpandedCompetitionRoster={id:"BRA2"|"BRA3"|"CB20"|"SPjr";name:string;shortName:string;kind:"professional"|"youth";season:2026;clubs:ExpandedClubRoster[]};');
out.push(`export const BRAZIL_2026_EXPANSION_META=${JSON.stringify({snapshot:"2026-09-06",source:"Transfermarkt competition/squad snapshot + CBF 2026 Brasileiro Sub-20 participants",counts})} as const;`);
out.push(`export const BRAZIL_2026_EXPANDED_COMPETITIONS:ExpandedCompetitionRoster[]=${JSON.stringify(snapshots)};`);
await mkdir("src/data/brazil-2026",{recursive:true});await writeFile("src/data/brazil-2026/expanded-rosters.ts",out.join("\n")+"\n");
console.log("DONE",JSON.stringify(counts));
