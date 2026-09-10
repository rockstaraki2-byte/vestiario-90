const CACHE="public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const UA="Mozilla/5.0 (compatible; Vestiario90/1.0)";

const CLUB_ALIASES:Record<string,string>={
  "tolima":"Deportes Tolima","santa fe":"Independiente Santa Fe","ldu quito":"Liga Deportiva Universitaria de Quito","liga de quito":"Liga Deportiva Universitaria de Quito","universidad central":"Universidad Central de Venezuela","puerto cabello":"Academia Puerto Cabello","barcelona":"Barcelona Sporting Club","barcelona sc":"Barcelona Sporting Club","racing":"Racing Club de Avellaneda","racing club":"Racing Club de Avellaneda","nacional":"Club Nacional de Football","river plate":"Club Atlético River Plate","boca juniors":"Boca Juniors","junior":"Atlético Junior","libertad":"Club Libertad","olimpia":"Club Olimpia","sporting cristal":"Sporting Cristal","cerro porteno":"Cerro Porteño","independiente del valle":"Independiente del Valle","coquimbo unido":"Coquimbo Unido","universitario":"Club Universitario de Deportes","bolivar":"Club Bolívar","always ready":"Club Always Ready","caracas":"Caracas FC","carabobo":"Carabobo FC","blooming":"Club Blooming","macara":"C.S.D. Macará","cienciano":"Cienciano","palestino":"Club Deportivo Palestino","audax italiano":"Audax Italiano","ohiggins":"O'Higgins F.C.","deportivo cuenca":"C.D. Cuenca","independiente petrolero":"Independiente Petrolero","deportivo riestra":"Deportivo Riestra","barracas central":"Barracas Central","montevideo city torque":"Montevideo City Torque","boston river":"Boston River","juventud":"Juventud de Las Piedras","alianza atletico":"Alianza Atlético","deportivo la guaira":"Deportivo La Guaira","independiente medellin":"Independiente Medellín","independiente rivadavia":"Independiente Rivadavia","universidad catolica":"Club Deportivo Universidad Católica"
};
const NATION_ISO:Record<string,string>={"brasil":"br","argentina":"ar","uruguai":"uy","paraguai":"py","equador":"ec","colombia":"co","chile":"cl","peru":"pe","venezuela":"ve","mexico":"mx","canada":"ca","estados unidos":"us","inglaterra":"gb-eng","escocia":"gb-sct","pais de gales":"gb-wls","franca":"fr","espanha":"es","portugal":"pt","alemanha":"de","italia":"it","paises baixos":"nl","belgica":"be","croacia":"hr","suica":"ch","marrocos":"ma","senegal":"sn","gana":"gh","africa do sul":"za","argelia":"dz","tunisia":"tn","egito":"eg","costa do marfim":"ci","rd congo":"cd","cabo verde":"cv","japao":"jp","coreia do sul":"kr","australia":"au","catar":"qa","ira":"ir","arabia saudita":"sa","iraque":"iq","jordania":"jo","uzbequistao":"uz","nova zelandia":"nz","turquia":"tr","austria":"at","suecia":"se","noruega":"no","dinamarca":"dk","servia":"rs","grecia":"gr","tchequia":"cz","bosnia e herzegovina":"ba","haiti":"ht","curacao":"cw","panama":"pa"};

export function normalizeBadgeName(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|cf|ec|sc|afc|club|clube)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
export function canonicalClubName(name:string){return CLUB_ALIASES[normalizeBadgeName(name)]??name}
export function nationFlagCode(name:string){return NATION_ISO[normalizeBadgeName(name)]}
function safeImage(url:string){try{const parsed=new URL(url);return parsed.protocol==="https:"&&["upload.wikimedia.org","tmssl.akamaized.net","img.a.transfermarkt.technology","flagcdn.com"].includes(parsed.hostname)?url:null}catch{return null}}
async function wikiImage(name:string,kind:"club"|"nation"){
 const candidates=kind==="nation"?[`${name} national football team`,`${name} men's national football team`]:[canonicalClubName(name),`${canonicalClubName(name)} football club`];
 for(const title of candidates){
  try{const response=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g,"_"))}`,{headers:{Accept:"application/json","User-Agent":UA},next:{revalidate:604800}});if(!response.ok)continue;const data=await response.json() as {thumbnail?:{source?:string};originalimage?:{source?:string}};const image=safeImage(data.originalimage?.source??data.thumbnail?.source??"");if(image)return image}catch{}
 }
 return null;
}
async function transfermarktImage(name:string){
 try{const response=await fetch(`https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(canonicalClubName(name))}`,{headers:{"User-Agent":UA,"Accept-Language":"pt-BR,pt;q=0.9,en;q=0.7"},next:{revalidate:604800}});if(!response.ok)return null;const html=await response.text();const matches=[...html.matchAll(/https:\/\/(?:tmssl\.akamaized\.net|img\.a\.transfermarkt\.technology)\/[^"'<>\s]*wappen[^"'<>\s]*/gi)];return matches.map(item=>safeImage(item[0].replace(/&amp;/g,"&"))).find(Boolean)??null}catch{return null}
}
async function resolveBadge(name:string,kind:"club"|"nation"){
 const wiki=await wikiImage(name,kind);if(wiki)return wiki;
 if(kind==="club"){const tm=await transfermarktImage(name);if(tm)return tm;}
 const iso=nationFlagCode(name);return kind==="nation"&&iso?`https://flagcdn.com/w160/${iso}.png`:null;
}
export async function GET(request:Request){
 const url=new URL(request.url),name=(url.searchParams.get("name")??"").trim(),kind=url.searchParams.get("kind")==="nation"?"nation":"club";if(!name||name.length>100)return new Response("Invalid team name",{status:400,headers:{"Cache-Control":CACHE}});
 try{const badge=await resolveBadge(name,kind);if(!badge)return new Response("Badge not found",{status:404,headers:{"Cache-Control":CACHE}});const response=await fetch(badge,{headers:{Accept:"image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8","User-Agent":UA},next:{revalidate:604800}}),type=response.headers.get("content-type")??"";if(!response.ok||!type.startsWith("image/"))return new Response("Badge unavailable",{status:502,headers:{"Cache-Control":CACHE}});return new Response(await response.arrayBuffer(),{status:200,headers:{"Content-Type":type,"Cache-Control":CACHE,"X-V90-Team-Badge":kind}})}catch{return new Response("Badge unavailable",{status:502,headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}})}
}
