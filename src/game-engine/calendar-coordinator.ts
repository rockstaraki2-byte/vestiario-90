import type { SeasonState } from "./season";
import type { LeagueFixture } from "./league";
import type { WorldCompetitionMatch, WorldParticipant } from "./world-competitions";

const DAY=86400000;
const aliases:Record<string,string>={"man city":"manchester city","man utd":"manchester united","paris":"paris saint germain","atleti":"atletico de madrid","vasco":"vasco da gama","atletico mg":"atletico mineiro","red bull bragantino sp":"red bull bragantino","sao paulo futebol clube":"sao paulo","ucv":"universidad central","ucv fc":"universidad central"};
function normalize(value:string){const key=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|afc|cf|ec|sc|saf|club|clube)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();return aliases[key]??key;}
function dateAdd(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
function dayDistance(a:string,b:string){return Math.abs(new Date(`${a}T12:00:00Z`).getTime()-new Date(`${b}T12:00:00Z`).getTime())/DAY;}
function participantKey(participant:WorldParticipant){return participant.activeClubId?`active:${participant.activeClubId}`:`name:${normalize(participant.name)}`;}
function cupKeys(match:WorldCompetitionMatch){return[participantKey(match.home),participantKey(match.away)];}
function priority(kind:string){return kind==="Continental"?3:2;}
function roundForDate(state:SeasonState,date:string){const dates=[...(state.worldCompetitions.roundDates??[])].sort((a,b)=>a.date.localeCompare(b.date));return dates.find(item=>item.date>=date)?.round??dates.at(-1)?.round??state.currentRound;}
function cupIndex(state:SeasonState){const index=new Map<string,string[]>();for(const tournament of state.worldCompetitions.tournaments)for(const match of tournament.matches.filter(item=>!item.played)){for(const key of cupKeys(match))index.set(key,[...(index.get(key)??[]),match.date]);}return index;}
function nearAny(index:Map<string,string[]>,keys:string[],date:string,minGap=2){return keys.some(key=>(index.get(key)??[]).some(item=>dayDistance(item,date)<minGap));}
function clone(state:SeasonState):SeasonState{return{...state,league:{...state.league,fixtures:state.league.fixtures.map(fixture=>({...fixture}))},worldCompetitions:structuredClone(state.worldCompetitions),worldLeagues:structuredClone(state.worldLeagues)};}

function coordinateCupConflicts(state:SeasonState){
  const tournaments=state.worldCompetitions.tournaments,all=tournaments.flatMap(tournament=>tournament.matches.filter(match=>!match.played).map(match=>({tournament,match}))).sort((a,b)=>a.match.date.localeCompare(b.match.date)||priority(b.tournament.definition.kind)-priority(a.tournament.definition.kind));
  const occupied=new Map<string,Array<{date:string;matchId:string}>>();
  for(const item of all){
    const keys=cupKeys(item.match),conflict=keys.some(key=>(occupied.get(key)??[]).some(entry=>entry.date===item.match.date));
    if(conflict){
      const original=item.match.date;let chosen=original;
      for(const delta of [2,-2,3,-3,4,-4,5,-5,6,7]){const candidate=dateAdd(original,delta);if(candidate<state.currentDate)continue;const safe=keys.every(key=>(occupied.get(key)??[]).every(entry=>dayDistance(entry.date,candidate)>=2));if(safe){chosen=candidate;break;}}
      if(chosen!==original){item.match.originalDate=item.match.originalDate??original;item.match.date=chosen;item.match.roundDue=roundForDate(state,chosen);item.match.rescheduledReason="Conflito entre competições: torneio de maior prioridade preservado.";}
    }
    for(const key of keys)occupied.set(key,[...(occupied.get(key)??[]),{date:item.match.date,matchId:item.match.id}]);
  }
}

function mainClubKey(state:SeasonState,id:string){const club=state.league.clubs.find(item=>item.id===id);return club?`active:${club.id}`:`name:${normalize(id)}`;}
function coordinateMainLeague(state:SeasonState){
  const cups=cupIndex(state),rounds=[...new Set(state.league.fixtures.filter(f=>!f.played).map(f=>f.round))].sort((a,b)=>a-b),roundDates=new Map<number,string>();
  for(const round of rounds){const fixtures=state.league.fixtures.filter(f=>!f.played&&f.round===round),original=fixtures.find(f=>f.date)?.date;if(!original)continue;const keys=[...new Set(fixtures.flatMap(f=>[mainClubKey(state,f.homeClubId),mainClubKey(state,f.awayClubId)]))],hasConflict=keys.some(key=>(cups.get(key)??[]).includes(original));let date=original;
    if(hasConflict){for(let delta=2;delta<=18;delta++){const candidate=dateAdd(original,delta);if(candidate<state.currentDate)continue;const noCup=!nearAny(cups,keys,candidate,2),noRound=[...roundDates.values()].every(other=>dayDistance(other,candidate)>=2);if(noCup&&noRound){date=candidate;break;}}}
    roundDates.set(round,date);if(date!==original)for(const fixture of fixtures){fixture.originalDate=fixture.originalDate??fixture.date;fixture.date=date;fixture.rescheduledReason="Rodada remarcada para evitar choque com copa/competição internacional.";}
  }
}

function parallelKeys(league:{teams:Array<{id:string;name:string}>},fixture:LeagueFixture){const names=[league.teams.find(team=>team.id===fixture.homeClubId)?.name,league.teams.find(team=>team.id===fixture.awayClubId)?.name].filter(Boolean) as string[];return names.map(name=>`name:${normalize(name)}`);}
function coordinateParallelLeagues(state:SeasonState){
  const cups=cupIndex(state);
  for(const league of Object.values(state.worldLeagues.leagues)){if(!league)continue;const clubDates=new Map<string,string[]>();for(const fixture of league.fixtures.filter(item=>!item.played).sort((a,b)=>(a.date??"").localeCompare(b.date??""))){if(!fixture.date)continue;const keys=parallelKeys(league,fixture),original=fixture.date,conflict=keys.some(key=>(cups.get(key)??[]).includes(original));let date=original;if(conflict){for(let delta=2;delta<=18;delta++){const candidate=dateAdd(original,delta),noCup=!nearAny(cups,keys,candidate,2),noLeague=keys.every(key=>(clubDates.get(key)??[]).every(other=>dayDistance(other,candidate)>=2));if(noCup&&noLeague){date=candidate;break;}}}if(date!==original){fixture.originalDate=fixture.originalDate??original;fixture.date=date;fixture.rescheduledReason="Partida de liga remarcada por compromisso de copa.";}for(const key of keys)clubDates.set(key,[...(clubDates.get(key)??[]),date]);}}
}

export function coordinateSeasonCalendars(source:SeasonState){const state=clone(source);coordinateCupConflicts(state);coordinateMainLeague(state);coordinateParallelLeagues(state);state.worldCompetitions.roundDates=state.league.fixtures.filter(f=>Boolean(f.date)).map(f=>({round:f.round,date:f.date!})).sort((a,b)=>a.date.localeCompare(b.date));return state;}
