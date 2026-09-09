import{writeFile,mkdir}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology";
const SPECS=[
["POR1","PO1","Liga Portugal","Portugal",18],["POR2","PO2","Liga Portugal 2","Portugal",18],
["GER1","L1","Bundesliga","Alemanha",18],["GER2","L2","2. Bundesliga","Alemanha",18],
["ITA1","IT1","Serie A","Itália",20],["ITA2","IT2","Serie B","Itália",20],
["USA1","MLS1","Major League Soccer","Estados Unidos",30],["RUS1","RU1","Russian Premier League","Rússia",16],
["KSA1","SA1","Saudi Pro League","Arábia Saudita",18]];
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0 (Vestiario90 sync)"};
const pos={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(p,attempt=1){try{const r=await fetch(BASE+"/"+p,{headers}),t=await r.text();if(!r.ok)throw new Error(p+" "+r.status+" "+t.slice(0,100));return JSON.parse(t)}catch(e){if(attempt>=4)throw e;await sleep(400*attempt);return api(p,attempt+1)}}
const uniq=xs=>[...new Set(xs.map(String).filter(Boolean))];
function tableIds(d){return uniq((d?.data?.tables??[]).flatMap(x=>x?.clubs??[]).map(x=>x?.clubId??x?.id))}
function listIds(d){const rows=Array.isArray(d?.data)?d.data:(d?.data?.clubs??d?.clubs??[]);return uniq((rows??[]).map(x=>x?.clubId??x?.id??x?.club?.id))}
async function competitionIds(code){try{const ids=tableIds(await api("competition/"+code+"/table"));if(ids.length)return ids}catch(e){console.warn("table fallback",code,String(e))}const ids=listIds(await api("competition/"+code+"/clubs"));if(!ids.length)throw new Error(code+": no clubs from table/clubs");return ids}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;async function worker(){while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out}
async function resolveClub(cid){const sd=await api("club/"+cid+"/squad"),pids=uniq((sd?.data?.squad??[]).map(x=>x?.playerId)),players=[];for(let i=0;i<pids.length;i+=40){const q=pids.slice(i,i+40).map(x=>"ids[]="+x).join("&"),pd=await api("players?"+q);for(const p of pd?.data??[]){const age=p?.lifeDates?.age;if(typeof age!=="number")continue;players.push({transfermarktId:String(p.id),name:String(p.name??"").trim(),position:pos[p?.attributes?.position?.shortName]??"MC",age,marketValueEur:typeof p?.marketValueDetails?.current?.value==="number"?p.marketValueDetails.current.value:null})}}const cd=await api("clubs?ids[]="+cid),c=cd?.data?.[0];return{sourceId:0,transfermarktId:Number(cid),name:String(c?.name??cid),shortName:String(c?.name??cid).slice(0,14).toUpperCase(),imageUrl:"https://tmssl.akamaized.net/images/wappen/head/"+cid+".png",marketValueEur:players.reduce((s,p)=>s+(p.marketValueEur??0),0),players}}
async function one([id,tm,name,country,expected]){const clubIds=await competitionIds(tm);if(clubIds.length<Math.max(12,expected-3))throw new Error(id+": only "+clubIds.length+" clubs");const clubs=(await mapLimit(clubIds,4,async cid=>{try{return await resolveClub(cid)}catch(e){console.warn("club skip",id,cid,String(e));return null}})).filter(Boolean);const playerCount=clubs.reduce((n,c)=>n+c.players.length,0);if(clubs.length<Math.max(12,expected-3)||playerCount<clubs.length*15)throw new Error(id+": insufficient coverage "+clubs.length+" clubs / "+playerCount+" players");return{id,name,shortName:name,country,season:2026,startDate:"2026-08-01",roundCadenceDays:7,doubleRoundRobin:true,benchSize:12,maxSubstitutions:5,clubs}}
const built=[],errors=[];for(const s of SPECS){try{const x=await one(s);built.push(x);console.log("OK",x.id,x.clubs.length,x.clubs.reduce((n,c)=>n+c.players.length,0))}catch(e){errors.push({id:s[0],error:String(e)});console.error("SKIP",s[0],String(e))}}
if(!built.length)throw new Error("no imports");
await mkdir("src/data/world-2026",{recursive:true});
const types='import type { EuropeClubRoster } from "../europe-2026/top-leagues";\nexport type AddedCompetitionId='+SPECS.map(s=>JSON.stringify(s[0])).join("|")+';\nexport type AddedCompetitionRoster={id:AddedCompetitionId;name:string;shortName:string;country:string;season:2026;startDate:string;roundCadenceDays:number;doubleRoundRobin:true;benchSize:number;maxSubstitutions:number;clubs:EuropeClubRoster[]};\n';
await writeFile("src/data/world-2026/added-leagues.generated.ts",types+"export const ADDED_2026_COMPETITIONS:AddedCompetitionRoster[]="+JSON.stringify(built)+";\nexport const ADDED_2026_SYNC_ERRORS="+JSON.stringify(errors)+" as const;\n");
