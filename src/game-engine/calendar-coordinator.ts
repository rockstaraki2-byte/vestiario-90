import type { SeasonState } from "./season";
import type { LeagueFixture } from "./league";
import type { WorldCompetitionMatch, WorldParticipant } from "./world-competitions";
import { processInternationalMarketRound } from "./international-market";
import { internationalWindowForDate, isClubDateBlockedByInternationalWindow } from "./international-calendar";

const DAY=86400000;
const MIN_CLUB_GAP=3;
const SEARCH_DAYS=140;
const aliases:Record<string,string>={"man city":"manchester city","man utd":"manchester united","paris":"paris saint germain","atleti":"atletico de madrid","vasco":"vasco da gama","atletico mg":"atletico mineiro","red bull bragantino sp":"red bull bragantino","sao paulo futebol clube":"sao paulo","ucv":"universidad central","ucv fc":"universidad central"};
function normalize(value:string){const key=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|afc|cf|ec|sc|saf|club|clube)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();return aliases[key]??key;}
function dateAdd(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
function dayDistance(a:string,b:string){return Math.abs(new Date(`${a}T12:00:00Z`).getTime()-new Date(`${b}T12:00:00Z`).getTime())/DAY;}
function participantKey(participant:WorldParticipant){return participant.activeClubId?`active:${participant.activeClubId}`:`name:${normalize(participant.name)}`;}
function cupKeys(match:WorldCompetitionMatch){return[participantKey(match.home),participantKey(match.away)];}
function priority(kind:string){return kind==="Continental"?4:3;}
function roundForDate(state:SeasonState,date:string){const dates=[...(state.worldCompetitions.roundDates??[])].sort((a,b)=>a.date.localeCompare(b.date));return dates.find(item=>item.date>=date)?.round??dates.at(-1)?.round??state.currentRound;}
function cupIndex(state:SeasonState){const index=new Map<string,string[]>();for(const tournament of state.worldCompetitions.tournaments)for(const match of tournament.matches.filter(item=>!item.played)){for(const key of cupKeys(match))index.set(key,[...(index.get(key)??[]),match.date]);}return index;}
function nearAny(index:Map<string,string[]>,keys:string[],date:string,minGap=MIN_CLUB_GAP){return keys.some(key=>(index.get(key)??[]).some(item=>dayDistance(item,date)<minGap));}
function clone(state:SeasonState):SeasonState{return{...state,league:{...state.league,fixtures:state.league.fixtures.map(fixture=>({...fixture}))},worldCompetitions:structuredClone(state.worldCompetitions),worldLeagues:structuredClone(state.worldLeagues)};}
function internationalReason(state:SeasonState,date:string){const window=internationalWindowForDate(date,state.year);return window?`${window.label}: ${window.reason}`:undefined;}
function candidateOffsets(blocked:boolean){if(blocked)return Array.from({length:SEARCH_DAYS},(_,index)=>index+1);const offsets:number[]=[];for(let delta=1;delta<=SEARCH_DAYS;delta++){offsets.push(delta);if(delta<=14)offsets.push(-delta);}return offsets;}

function coordinateCupConflicts(state:SeasonState){
  const tournaments=state.worldCompetitions.tournaments,all=tournaments.flatMap(tournament=>tournament.matches.filter(match=>!match.played).map(match=>({tournament,match}))).sort((a,b)=>a.match.date.localeCompare(b.match.date)||priority(b.tournament.definition.kind)-priority(a.tournament.definition.kind));
  const occupied=new Map<string,Array<{date:string;matchId:string}>>();
  for(const item of all){
    const keys=cupKeys(item.match),original=item.match.date,blocked=isClubDateBlockedByInternationalWindow(original,state.year),conflict=blocked||keys.some(key=>(occupied.get(key)??[]).some(entry=>dayDistance(entry.date,original)<MIN_CLUB_GAP));
    if(conflict){
      let chosen=original;
      for(const delta of candidateOffsets(blocked)){const candidate=dateAdd(original,delta);if(candidate<state.currentDate||isClubDateBlockedByInternationalWindow(candidate,state.year))continue;const safe=keys.every(key=>(occupied.get(key)??[]).every(entry=>dayDistance(entry.date,candidate)>=MIN_CLUB_GAP));if(safe){chosen=candidate;break;}}
      if(chosen!==original){item.match.originalDate=item.match.originalDate??original;item.match.date=chosen;item.match.roundDue=roundForDate(state,chosen);item.match.rescheduledReason=blocked?`${internationalReason(state,original)} Partida de clubes reagendada.`:"Conflito de calendário: foi preservado um intervalo mínimo entre compromissos do clube.";}
    }
    for(const key of keys)occupied.set(key,[...(occupied.get(key)??[]),{date:item.match.date,matchId:item.match.id}]);
  }
}

function mainClubKey(state:SeasonState,id:string){const club=state.league.clubs.find(item=>item.id===id);return club?`active:${club.id}`:`name:${normalize(id)}`;}
function coordinateMainLeague(state:SeasonState){
  const cups=cupIndex(state),rounds=[...new Set(state.league.fixtures.filter(f=>!f.played).map(f=>f.round))].sort((a,b)=>a-b),roundDates=new Map<number,string>();
  for(const round of rounds){
    const fixtures=state.league.fixtures.filter(f=>!f.played&&f.round===round);
    const dates=[...new Set(fixtures.map(f=>f.date).filter(Boolean))] as string[];
    if(dates.length!==1)continue;
    const original=dates[0];
    const keys=[...new Set(fixtures.flatMap(f=>[mainClubKey(state,f.homeClubId),mainClubKey(state,f.awayClubId)]))],blocked=isClubDateBlockedByInternationalWindow(original,state.year),hasConflict=blocked||nearAny(cups,keys,original,MIN_CLUB_GAP);let date=original;
    if(hasConflict){for(let delta=1;delta<=SEARCH_DAYS;delta++){const candidate=dateAdd(original,delta);if(candidate<state.currentDate||isClubDateBlockedByInternationalWindow(candidate,state.year))continue;const noCup=!nearAny(cups,keys,candidate,MIN_CLUB_GAP),noRound=[...roundDates.values()].every(other=>dayDistance(other,candidate)>=MIN_CLUB_GAP);if(noCup&&noRound){date=candidate;break;}}}
    roundDates.set(round,date);
    if(date!==original)for(const fixture of fixtures){fixture.originalDate=fixture.originalDate??fixture.date;fixture.date=date;fixture.rescheduledReason=blocked?`${internationalReason(state,original)} Rodada remarcada.`:"Rodada remarcada para garantir descanso entre liga e copa/competição internacional.";}
  }
}

function repairControlledClubSchedule(state:SeasonState){
  if(state.career?.status==="Sem clube")return;
  const clubId=state.selectedClubId;
  const clubFixtures=state.league.fixtures.filter(f=>f.homeClubId===clubId||f.awayClubId===clubId);
  const cupDates=state.worldCompetitions.tournaments.flatMap(tournament=>tournament.matches.filter(match=>match.home.activeClubId===clubId||match.away.activeClubId===clubId).map(match=>match.date));
  const occupied=clubFixtures.filter(f=>f.played&&Boolean(f.date)).map(f=>f.date!);
  let latest=occupied.reduce<string|undefined>((value,date)=>!value||date>value?date:value,undefined);
  const pending=clubFixtures.filter(f=>!f.played&&Boolean(f.date)).sort((a,b)=>a.round-b.round||(a.date??"").localeCompare(b.date??""));
  for(const fixture of pending){
    const original=fixture.date!;
    let start=original<state.currentDate?state.currentDate:original;
    if(latest){const ordered=dateAdd(latest,MIN_CLUB_GAP);if(ordered>start)start=ordered;}
    const collides=original<state.currentDate||isClubDateBlockedByInternationalWindow(original,state.year)||cupDates.some(date=>dayDistance(date,original)<MIN_CLUB_GAP)||occupied.some(date=>dayDistance(date,original)<MIN_CLUB_GAP)||Boolean(latest&&original<dateAdd(latest,MIN_CLUB_GAP));
    let chosen=original;
    if(collides){
      chosen=start;
      for(let delta=0;delta<=SEARCH_DAYS;delta++){
        const candidate=dateAdd(start,delta);
        if(isClubDateBlockedByInternationalWindow(candidate,state.year))continue;
        if(cupDates.some(date=>dayDistance(date,candidate)<MIN_CLUB_GAP))continue;
        if(occupied.some(date=>dayDistance(date,candidate)<MIN_CLUB_GAP))continue;
        chosen=candidate;break;
      }
    }
    if(chosen!==original){fixture.originalDate=fixture.originalDate??original;fixture.date=chosen;fixture.rescheduledReason=original<state.currentDate?"Partida atrasada reposicionada para a próxima data válida do calendário.":"Partida remarcada para evitar sobreposição e preservar o intervalo entre compromissos do clube.";}
    occupied.push(fixture.date!);latest=fixture.date!;
  }
  if(pending[0])state.currentRound=pending[0].round;
}

function parallelKeys(league:{teams:Array<{id:string;name:string}>},fixture:LeagueFixture){const names=[league.teams.find(team=>team.id===fixture.homeClubId)?.name,league.teams.find(team=>team.id===fixture.awayClubId)?.name].filter(Boolean) as string[];return names.map(name=>`name:${normalize(name)}`);}
function coordinateParallelLeagues(state:SeasonState){
  const cups=cupIndex(state);
  for(const league of Object.values(state.worldLeagues.leagues)){
    if(!league)continue;
    const clubDates=new Map<string,string[]>();
    for(const fixture of league.fixtures.filter(item=>!item.played).sort((a,b)=>(a.date??"").localeCompare(b.date??""))){
      if(!fixture.date)continue;
      const keys=parallelKeys(league,fixture),original=fixture.date,blocked=isClubDateBlockedByInternationalWindow(original,state.year),conflict=blocked||nearAny(cups,keys,original,MIN_CLUB_GAP);let date=original;
      if(conflict){for(let delta=1;delta<=SEARCH_DAYS;delta++){const candidate=dateAdd(original,delta);if(isClubDateBlockedByInternationalWindow(candidate,state.year))continue;const noCup=!nearAny(cups,keys,candidate,MIN_CLUB_GAP),noLeague=keys.every(key=>(clubDates.get(key)??[]).every(other=>dayDistance(other,candidate)>=MIN_CLUB_GAP));if(noCup&&noLeague){date=candidate;break;}}}
      if(date!==original){fixture.originalDate=fixture.originalDate??original;fixture.date=date;fixture.rescheduledReason=blocked?`${internationalReason(state,original)} Liga remarcada.`:"Partida de liga remarcada para preservar intervalo entre compromissos.";}
      for(const key of keys)clubDates.set(key,[...(clubDates.get(key)??[]),date]);
    }
  }
}

export type ClubCommitment={
 id:string;
 kind:"league"|"cup";
 date:string;
 competition:string;
 stage:string;
 opponentName:string;
 opponentClubId?:string;
 isHome:boolean;
 played:boolean;
 score?:string;
 originalDate?:string;
 rescheduledReason?:string;
};

export function clubCommitments(state:SeasonState):ClubCommitment[]{
 const club=state.league.clubs.find(item=>item.id===state.selectedClubId)??state.league.clubs[0],items:ClubCommitment[]=[];
 for(const fixture of state.league.fixtures.filter(f=>f.homeClubId===club.id||f.awayClubId===club.id)){
  if(!fixture.date)continue;const isHome=fixture.homeClubId===club.id,opponentId=isHome?fixture.awayClubId:fixture.homeClubId,opponent=state.league.clubs.find(item=>item.id===opponentId);
  items.push({id:fixture.id,kind:"league",date:fixture.date,competition:state.league.competitionName??"Liga",stage:`Rodada ${fixture.round}`,opponentName:opponent?.name??"Adversário",opponentClubId:opponent?.id,isHome,played:fixture.played,score:fixture.played?`${fixture.homeGoals??0} × ${fixture.awayGoals??0}`:undefined,originalDate:fixture.originalDate,rescheduledReason:fixture.rescheduledReason});
 }
 for(const tournament of state.worldCompetitions.tournaments)for(const match of tournament.matches.filter(item=>item.home.activeClubId===club.id||item.away.activeClubId===club.id)){
  const isHome=match.home.activeClubId===club.id,opponent=isHome?match.away:match.home;
  items.push({id:match.id,kind:"cup",date:match.date,competition:tournament.definition.shortName,stage:match.stage,opponentName:opponent.name,opponentClubId:opponent.activeClubId,isHome,played:match.played,score:match.played?`${match.homeGoals??0} × ${match.awayGoals??0}`:undefined,originalDate:match.originalDate,rescheduledReason:match.rescheduledReason});
 }
 return items.sort((a,b)=>a.date.localeCompare(b.date)||(a.kind===b.kind?0:a.kind==="cup"?-1:1));
}
export function nextClubCommitment(state:SeasonState){return clubCommitments(state).find(item=>!item.played&&item.date>=state.currentDate);}

export function coordinateSeasonCalendars(source:SeasonState){
 const marketAlreadyTicked=source.market?.lastProcessedDate===source.currentDate;
 const withInternationalTick=marketAlreadyTicked?processInternationalMarketRound(source):source;
 const state=clone(withInternationalTick);
 coordinateCupConflicts(state);
 coordinateMainLeague(state);
 repairControlledClubSchedule(state);
 coordinateParallelLeagues(state);
 state.worldCompetitions.roundDates=state.league.fixtures.filter(f=>Boolean(f.date)).map(f=>({round:f.round,date:f.date!})).sort((a,b)=>a.date.localeCompare(b.date));
 return state;
}