const BASE="https://tmapi-alpha.transfermarkt.technology";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
async function api(path){const r=await fetch(`${BASE}/${path}`,{headers});const text=await r.text();if(!r.ok)throw new Error(`${path}: ${r.status} ${text.slice(0,300)}`);return JSON.parse(text);}
const ids=[17661,15069,137926,15555,93845,16653,14702,15038,12690,64675,17955,77246,14807,14708,15002,52226,16658,104248,14876,9540,17818,14724,19325,95439,21828,28052];
const qs=ids.map(id=>`ids[]=${id}`).join("&");
const data=await api(`clubs?${qs}`);
console.log(JSON.stringify((data?.data??[]).map(c=>({id:String(c.id),name:c.name,shortName:c.shortName??c.name})),null,2));
