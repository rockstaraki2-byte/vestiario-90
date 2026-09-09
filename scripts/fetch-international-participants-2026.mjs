import{writeFile,mkdir}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology",headers={Accept:"application/json","User-Agent":"Mozilla/5.0 (Vestiario90 international sync)"};
const SPECS=[
  {id:"LIB",codes:["CLI"],name:"CONMEBOL Libertadores",expected:32},
  {id:"SUD",codes:["CS"],name:"CONMEBOL Sudamericana",expected:32},
  {id:"UCL",codes:["CL"],name:"UEFA Champions League",expected:36},
  {id:"UEL",codes:["EL"],name:"UEFA Europa League",expected:36},
  {id:"UECL",codes:["UCOL"],name:"UEFA Conference League",expected:36}
];
const POSITION={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,attempt=1){try{const r=await fetch(`${BASE}/${path}`,{headers});const text=await r.text();if(!r.ok)throw new Error(`${path} ${r.status} ${text.slice(0,120)}`);return JSON.parse(text)}catch(e){if(attempt>=4)throw e;await sleep(500*attempt);return api(path,attempt+1)}}
const uniq=xs=>[...new Set(xs.map(String).filter(Boolean))];
function tableIds(d){return uniq((d?.data?.tables??[]).flatMap(t=>t?.clubs??[]).map(c=>c?.clubId??c?.id))}
function clubListIds(d){const rows=Array.isArray(d?.data)?d.data:(d?.data?.clubs??d?.clubs??[]);return uniq((rows??[]).map(c=>c?.clubId??c?.id??c?.club?.id??c?.club?.clubId))}
async function participants(code){let err=null;try{const ids=tableIds(await api(`competition/${code}/table`));if(ids.length)return{ids,source:"table"}}catch(e){err=e}try{const ids=clubListIds(await api(`competition/${code}/clubs`));if(ids.length)return{ids,source:"clubs"}}catch(e){if(!err)err=e}throw new Error(`${code}: no participants${err?` (${String(err)})`:""}`)}
async function getClubs(ids){const out=[];for(let i=0;i<ids.length;i+=20){const q=ids.slice(i,i+20).map(id=>`ids[]=${id}`).join("&");out.push(...((await api(`clubs?${q}`))?.data??[]))}return out}
async function getSquadIds(clubId){return((await api(`club/${clubId}/squad`))?.data?.squad??[]).map(p=>String(p.playerId)).filter(Boolean)}
async function getPlayers(ids){const out=[];for(let i=0;i<ids.length;i+=40){const q=ids.slice(i,i+40).map(id=>`ids[]=${id}`).join("&");out.push(...((await api(`players?${q}`))?.data??[]))}return out}
function player(p){const age=p?.lifeDates?.age;if(typeof age!=="number")return null;const value=p?.marketValueDetails?.current?.value;return{transfermarktId:String(p.id),name:String(p.name??"").trim(),position:POSITION[p?.attributes?.position?.shortName]??"MC",age,marketValueEur:typeof value==="number"&&value>0?value:null,...(p?.marketValueDetails?.current?.determined?{marketValueUpdated:p.marketValueDetails.current.determined}:{})}}
const participantsOut=[],rostersOut=[],errors=[],signatures=new Map();
for(const spec of SPECS){try{let found=null;for(const code of spec.codes){try{found=await participants(code);if(found?.ids?.length)break}catch{}}if(!found?.ids?.length)throw new Error(`${spec.id}: no valid participant source`);const clubIds=found.ids;const signature=[...clubIds].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(",");const duplicate=signatures.get(signature);if(duplicate)throw new Error(`${spec.id}: participant set duplicates ${duplicate}`);signatures.set(signature,spec.id);if(clubIds.length<Math.max(24,spec.expected-6))throw new Error(`${spec.id}: suspiciously low participant count ${clubIds.length}`);
const clubs=await getClubs(clubIds),clubById=new Map(clubs.map(c=>[String(c.id),c])),allPlayerIds=new Set,squadByClub=new Map;
for(const clubId of clubIds){try{const ids=await getSquadIds(clubId);squadByClub.set(clubId,ids);ids.forEach(id=>allPlayerIds.add(id))}catch(e){console.warn("squad skip",spec.id,clubId,String(e));squadByClub.set(clubId,[])}}
const profiles=new Map((await getPlayers([...allPlayerIds])).map(p=>[String(p.id),p]));
const rosters=clubIds.map(clubId=>{const c=clubById.get(clubId),players=(squadByClub.get(clubId)??[]).map(id=>profiles.get(id)).filter(Boolean).map(player).filter(Boolean);return{sourceId:0,transfermarktId:Number(clubId),name:String(c?.name??`Club ${clubId}`),shortName:String(c?.name??clubId).slice(0,14).toUpperCase(),imageUrl:`https://tmssl.akamaized.net/images/wappen/head/${clubId}.png`,marketValueEur:players.reduce((s,p)=>s+(p.marketValueEur??0),0),players}});
participantsOut.push({id:spec.id,name:spec.name,clubIds});rostersOut.push({competitionId:spec.id,clubs:rosters});console.log("OK",spec.id,clubIds.length,rosters.reduce((n,c)=>n+c.players.length,0),found.source)}catch(e){errors.push({id:spec.id,error:String(e)});console.error("SKIP",spec.id,String(e))}}
if(!participantsOut.length)throw new Error("No international competition imported");
await mkdir("src/data/world-2026",{recursive:true});
await writeFile("src/data/world-2026/international-participants.generated.ts",`export const INTERNATIONAL_2026_PARTICIPANTS=${JSON.stringify(participantsOut)} as const;\nexport const INTERNATIONAL_2026_SYNC_ERRORS=${JSON.stringify(errors)} as const;\n`);
await writeFile("src/data/world-2026/international-rosters.generated.ts",`import type { EuropeClubRoster } from "../europe-2026/top-leagues";\nexport type InternationalRosterSnapshot={competitionId:string;clubs:EuropeClubRoster[]};\nexport const INTERNATIONAL_2026_ROSTERS:InternationalRosterSnapshot[]=${JSON.stringify(rostersOut)};\n`);
if(errors.length)console.warn("Partial international sync:",errors.map(e=>e.id).join(","));
