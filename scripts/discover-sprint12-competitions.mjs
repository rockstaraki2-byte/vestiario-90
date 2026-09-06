const BASE="https://tmapi-alpha.transfermarkt.technology";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
async function api(path){
 const r=await fetch(`${BASE}/${path}`,{headers});
 const text=await r.text();
 let data;try{data=JSON.parse(text)}catch{data=text.slice(0,2000)}
 console.log(`\n### ${path} ${r.status}`);
 if(!r.ok){console.log(String(text).slice(0,1200));return null;}
 console.log(JSON.stringify(data,null,2).slice(0,15000));
 return data;
}
for(const code of ["BRA2","BRA3","CB20","SPjr"]){
 await api(`competition/${code}`);
 await api(`competition/${code}/table`);
}
