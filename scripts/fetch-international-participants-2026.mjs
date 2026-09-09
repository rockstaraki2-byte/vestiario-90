import{writeFile,mkdir}from"node:fs/promises";
const BASE="https://tmapi-alpha.transfermarkt.technology",headers={Accept:"application/json","User-Agent":"Mozilla/5.0"};
const SPECS=[["LIB","CL","CONMEBOL Libertadores"],["SUD","CS","CONMEBOL Sudamericana"],["UCL","CL","UEFA Champions League"],["UEL","EL","UEFA Europa League"],["UECL","UCOL","UEFA Conference League"]];
async function api(p){const r=await fetch(BASE+"/"+p,{headers});if(!r.ok)throw new Error(p+" "+r.status);return r.json()}
const out=[];for(const [id,code,name] of SPECS){try{const d=await api("competition/"+code+"/table"),clubIds=[...new Set((d?.data?.tables??[]).flatMap(t=>t.clubs??[]).map(c=>String(c.clubId)))];out.push({id,name,clubIds});console.log(id,clubIds.length)}catch(e){console.error("skip",id,String(e))}}
await mkdir("src/data/world-2026",{recursive:true});await writeFile("src/data/world-2026/international-participants.generated.ts","export const INTERNATIONAL_2026_PARTICIPANTS="+JSON.stringify(out)+" as const;\n");
