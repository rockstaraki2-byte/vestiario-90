const BASE="https://tmapi-alpha.transfermarkt.technology";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
async function api(path){
 const r=await fetch(`${BASE}/${path}`,{headers});
 const text=await r.text();
 let data;try{data=JSON.parse(text)}catch{data=text.slice(0,1200)}
 if(!r.ok)throw new Error(`${path}: ${r.status} ${String(text).slice(0,300)}`);
 return data;
}
function idsFromTable(data){return [...new Set((data?.data?.tables??[]).flatMap(t=>t.clubs??[]).map(c=>String(c.clubId)))];}
async function clubs(ids){
 const out=[];
 for(let i=0;i<ids.length;i+=20){
  const qs=ids.slice(i,i+20).map(id=>`ids[]=${id}`).join("&");
  const data=await api(`clubs?${qs}`);out.push(...(data?.data??[]));
 }
 return out;
}
async function squadSummary(club){
 const raw=await api(`club/${club.id}/squad`),squad=raw?.data?.squad??[];
 const ids=squad.slice(0,40).map(p=>String(p.playerId)).filter(Boolean);
 let profiles=[];
 if(ids.length){const qs=ids.map(id=>`ids[]=${id}`).join("&");profiles=(await api(`players?${qs}`))?.data??[];}
 return{name:club.name,id:String(club.id),squadSize:squad.length,ages:profiles.map(p=>p?.lifeDates?.age).filter(Number.isFinite),sample:profiles.slice(0,8).map(p=>({name:p.name,age:p?.lifeDates?.age,position:p?.attributes?.position?.shortName}))};
}
for(const code of ["BRA2","BRA3","SPjr"]){
 const info=await api(`competition/${code}`),table=await api(`competition/${code}/table`),ids=idsFromTable(table),resolved=await clubs(ids);
 console.log(`\n### ${code}`,{display:info?.data?.currentSeason?.display,uniqueClubs:ids.length,resolved:resolved.length});
 console.log(resolved.slice(0,30).map(c=>({id:String(c.id),name:c.name,shortName:c.shortName??c.name,image:c.imageUrl??c.logoUrl??c.image}))); 
 const probes=[];
 for(const club of resolved.slice(0,3))probes.push(await squadSummary(club));
 console.log("SQUADS",JSON.stringify(probes,null,2));
}
