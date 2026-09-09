import{writeFile,mkdir}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology",headers={Accept:"application/json","User-Agent":"Mozilla/5.0 (Vestiario90 sync)"};
const SPECS=[["LIB","CLI","CONMEBOL Libertadores"],["SUD","CS","CONMEBOL Sudamericana"],["UCL","CL","UEFA Champions League"],["UEL","EL","UEFA Europa League"],["UECL","UCOL","UEFA Conference League"]];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(p,attempt=1){try{const r=await fetch(BASE+"/"+p,{headers});if(!r.ok)throw new Error(p+" "+r.status);return r.json()}catch(e){if(attempt>=4)throw e;await sleep(400*attempt);return api(p,attempt+1)}}
const uniq=xs=>[...new Set(xs.map(String).filter(Boolean))];
function tableIds(d){return uniq((d?.data?.tables??[]).flatMap(t=>t?.clubs??[]).map(c=>c?.clubId??c?.id))}
function clubListIds(d){const rows=Array.isArray(d?.data)?d.data:(d?.data?.clubs??d?.clubs??[]);return uniq((rows??[]).map(c=>c?.clubId??c?.id??c?.club?.id??c?.club?.clubId))}
async function participants(code){let tableError=null;try{const ids=tableIds(await api("competition/"+code+"/table"));if(ids.length)return{ids,source:"table"}}catch(e){tableError=e}try{const ids=clubListIds(await api("competition/"+code+"/clubs"));if(ids.length)return{ids,source:"clubs"}}catch(e){if(!tableError)tableError=e}throw new Error(code+": no participants from table/clubs"+(tableError?" ("+String(tableError)+")":""))}
const out=[],errors=[],signatures=new Map();
for(const[id,code,name]of SPECS){try{const{ids:clubIds,source}=await participants(code);const signature=[...clubIds].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(",");const duplicate=signatures.get(signature);if(duplicate)throw new Error(id+": participant set duplicates "+duplicate);signatures.set(signature,id);out.push({id,name,clubIds});console.log("OK",id,code,clubIds.length,source)}catch(e){errors.push({id,code,error:String(e)});console.error("SKIP",id,String(e))}}
if(!out.length)throw new Error("No international competition participants imported");
await mkdir("src/data/world-2026",{recursive:true});
const content="export const INTERNATIONAL_2026_PARTICIPANTS="+JSON.stringify(out)+" as const;\nexport const INTERNATIONAL_2026_SYNC_ERRORS="+JSON.stringify(errors)+" as const;\n";
await writeFile("src/data/world-2026/international-participants.generated.ts",content);
if(errors.length)console.warn("Partial international sync:",errors.map(e=>e.id).join(","));
