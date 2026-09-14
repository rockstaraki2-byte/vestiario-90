import { PROFESSIONAL_COMPETITIONS } from "../data/brazil-2026/competitions";
import { resolveInternationalCupField, type InternationalCupEngineId } from "../data/world-2026/international-cup-fields";
import type { QualificationEntrant } from "./season-ecosystem";

const UEFA_IDS:InternationalCupEngineId[]=["UCL","UEL","UECL"];
const CONMEBOL_IDS:InternationalCupEngineId[]=["LIB","SUD"];

export const NEXT_SEASON_TOP_LEAGUE_SLOTS={
 UCL:{ENG1:4,ESP1:4,GER1:4,ITA1:4,FRA1:3,POR1:2},
 UEL:{ENG1:2,ESP1:2,GER1:2,ITA1:2,FRA1:2,POR1:2},
 UECL:{ENG1:1,ESP1:1,GER1:1,ITA1:1,FRA1:1,POR1:1},
} as const;

function key(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|afc|cf|ec|sc|saf)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
function equivalent(a:string,b:string){const x=key(a),y=key(b);if(x===y)return true;const shorter=x.length<=y.length?x:y,longer=x.length<=y.length?y:x;return shorter.includes(" ")&&shorter.length>=8&&longer.includes(shorter);}
function repFromValue(value:number){if(!value||value<=0)return 62;return Math.max(55,Math.min(92,Math.round(48+Math.log10(value)*5.1)));}

function domesticClub(name:string){for(const competition of PROFESSIONAL_COMPETITIONS){const club=competition.clubs.find(item=>equivalent(item.name,name));if(club)return{club,country:competition.country};}return undefined;}

export function realContinentalFallbackPool(id:InternationalCupEngineId):QualificationEntrant[]{
 const ids=id==="LIB"||id==="SUD"?CONMEBOL_IDS:UEFA_IDS;
 const result:QualificationEntrant[]=[];
 const seen=new Set<string>();
 for(const competitionId of ids){
  const field=resolveInternationalCupField(competitionId);
  for(const club of field.clubs){
   const normalized=key(club.name);
   if(seen.has(normalized))continue;
   seen.add(normalized);
   const domestic=domesticClub(club.name);
   result.push({
    name:club.name,
    shortName:club.shortName,
    country:domestic?.country??field.config.confederation,
    reputation:domestic?repFromValue(domestic.club.marketValueEur):repFromValue(club.marketValueEur),
    reason:"Coeficiente/rota continental real",
   });
  }
 }
 return result;
}

export function completeRealQualificationField(base:QualificationEntrant[],id:InternationalCupEngineId,count:number,blocked=new Set<string>()){
 const out:QualificationEntrant[]=[];
 const used=new Set<string>();
 const add=(entry:QualificationEntrant)=>{
  const normalized=key(entry.name);
  if(blocked.has(normalized)||used.has(normalized)||out.length>=count)return;
  used.add(normalized);
  out.push(entry);
 };
 base.forEach(add);
 realContinentalFallbackPool(id).forEach(add);
 if(out.length!==count)throw new Error(`${id}: real qualification field incomplete ${out.length}/${count}`);
 return out;
}

export function qualificationClubKey(value:string){return key(value);}
