import { NATIONAL_TEAMS_2026 } from "../data/national-teams-2026";
import { internationalWindowForDate } from "./international-calendar";
import type { SeasonState } from "./season";

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const knownNation=(value:string)=>NATIONAL_TEAMS_2026.some(team=>normalize(team.name)===normalize(value));

/**
 * Players called by national teams are physically away from their clubs during
 * an international window. The user-managed national team uses the exact
 * selected squad; other nations use a deterministic top-26 selection from the
 * active league so AI clubs are subject to the same rule.
 */
export function internationalDutyPlayerIds(state:SeasonState,date=state.currentDate){
 const window=internationalWindowForDate(date,state.year),blocked=new Set<string>();
 if(!window)return blocked;
 const managedName=state.nationalCareer.status==="Empregado"?state.nationalCareer.teamName:undefined;
 if(state.nationalCareer.status==="Empregado"){
  const squad=new Set(state.nationalCareer.squadIds??[]);
  for(const player of state.nationalCareer.pool??[])if(squad.has(player.id)&&player.sourcePlayerId)blocked.add(player.sourcePlayerId);
 }
 const groups=new Map<string,Array<{id:string;overall:number;potential:number;condition:number}>>();
 for(const club of state.league.clubs)for(const player of club.players){
  const nation=player.nationality?.trim();
  if(!nation||!knownNation(nation)||(managedName&&normalize(nation)===normalize(managedName)))continue;
  const key=normalize(nation),list=groups.get(key)??[];
  list.push({id:player.id,overall:player.overall,potential:player.potential??player.overall,condition:player.condition});groups.set(key,list);
 }
 for(const list of groups.values())for(const player of list.sort((a,b)=>b.overall-a.overall||b.potential-a.potential||b.condition-a.condition).slice(0,26))blocked.add(player.id);
 return blocked;
}

export function internationalDutyReason(state:SeasonState,playerId:string,date=state.currentDate){
 const window=internationalWindowForDate(date,state.year);
 return window&&internationalDutyPlayerIds(state,date).has(playerId)?`A serviço da seleção • ${window.label}`:undefined;
}
