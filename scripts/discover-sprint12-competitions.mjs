const BASE="https://tmapi-alpha.transfermarkt.technology";
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
async function api(path){const r=await fetch(`${BASE}/${path}`,{headers});const text=await r.text();if(!r.ok)throw new Error(`${path}: ${r.status} ${text.slice(0,300)}`);return JSON.parse(text);}
const teams=["Avaí U20","Juventude U20","Vitória U20","Botafogo FR U20","Fluminense U20","Athletico Paranaense U20","Grêmio U20","Fortaleza U20","São Paulo U20","Flamengo U20","Cruzeiro U20","Corinthians U20","Santos U20","Bahia U20","Vasco da Gama U20","Red Bull Bragantino U20","Cuiabá U20","Criciúma U20","Palmeiras U20","América Mineiro U20"];
for(const term of teams){const data=await api(`quick-search?term=${encodeURIComponent(term)}`);console.log(`\n### ${term}`);console.log(JSON.stringify(data?.data??data,null,2).slice(0,7000));}
