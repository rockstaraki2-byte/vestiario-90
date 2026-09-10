import type { SeasonState } from "./season";
import type { LeagueFixture } from "./league";
import type { WorldCompetitionMatch, WorldParticipant } from "./world-competitions";
import { processInternationalMarketRound } from "./international-market";
import { internationalWindowForDate, isClubDateBlockedByInternationalWindow } from "./international-calendar";

const DAY=86400000;
const MIN_CLUB_GAP=3;
const SEARCH_DAYS=365;
const aliases:Record<string,string>={"man city":"manchester city","man utd":"manchester united","paris":"paris saint germain","atleti":"atletico de madrid","vasco":"vasco da gama","atletico mg":"atletico mineiro","red bull bragantino sp":"red bull bragantino","sao paulo futebol clube":"sao paulo","ucv":"universidad central","ucv fc":"universidad central"};
function normalize(value:string){const key=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|afc|cf|ec|sc|saf|club|clube)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();return aliases[key]??key;}
function dateAdd(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
function dayDistance(a:string,b:string){return Math.abs(new Date(`${a}T12:00:00Z`).getTime()-new Date(`${b}T12:00:00Z`).getTime())/DAY;}
function participantKey(participant:WorldParticipant){return participant.activeClubId?`active:${participant.activeClubId}`:`name:${normalize(participant.name)}`;}
function cupKeys(match:WorldCompetitionMatch){return[participantKey(match.home),participantKey(match.away)];}
function priority(kind:string){return kind==="Continental"?4:3;}
function roundForDate(state:SeasonState,date:string){const dates=[...(state.worldCompetitions.roundDates??[])].sort((a,b)=>a.date.localeCompare(b.date));return dates.find(item=>item.date>=date)?.round??dates.at(-1)?.round??state.currentRound;}
function cupIndex(state:SeasonState){const index=new Map<string,string[]>();for(const tournament of state.worldCompetitions.tournaments)for(const match of tournament.matches){for(const key of cupKeys(match))index.set(key,[...(index.get(key)??[]),match.date]);}return index;}
function nearAny(index:Map<string,string[]>,keys:string[],date:string,minGap=MIN_CLUB_GAP){return keys.some(key=>(index.get(key)??[]).some(item=>dayDistance(item,date)<minGap));}
function clone(state:SeasonState):SeasonState{return{...state,league:{...state.league,fixtures:state.league.fixtures.map(fixture=>({...fixture}))},worldCompetitions:structuredClone(state.worldCompetitions),worldLeagues:structuredClone(state.worldLeagues)};}
function internationalReason(state:SeasonState,date:string){const window=internationalWindowForDate(date,state.year);return window?`${window.label}: ${window.reason}`:undefined;}
function addOccupied(index:Map<string,string[]>,key:string,date?:string){if(!date)return;const dates=index.get(key)??[];if(!dates.includes(date))index.set(key,[...dates,date]);}
function latestOccupied(index:Map<string,string[]>,keys:string[]){let latest:string|undefined;for(const key of keys)for(const date of index.get(key)??[])if(!latest||date>latest)latest=date;return latest;}
function nextSafeDate(start:string,isSafe:(candidate:string)=>boolean){for(let delta=0;delta<=SEARCH_DAYS;delta++){const candidate=dateAdd(start,delta);if(isSafe(candidate))return candidate;}return start;}

function fixedCupOccupancy(state:SeasonState){
  const occupied=new Map<string,string[]>();
  for(const tournament of state.worldCompetitions.tournaments)for(const match of tournament.matches.filter(item=>item.played))for(const key of cupKeys(match))addOccupied(occupied,key,match.date);
  for(const fixture of state.league.fixtures.filter(item=>item.played&&Boolean(item.date))){addOccupied(occupied,`active:${fixture.homeClubId}`,fixture.date);addOccupied(occupied,`active:${fixture.awayClubId}`,fixture.date);}
  return occupied;
}

function coordinateCupConflicts(state:SeasonState){
  const tournaments=state.worldCompetitions.tournaments,all=tournaments.flatMap(tournament=>tournament.matches.filter(match=>!match.played).map(match=>({tournament,match}))).sort((a,b)=>a.match.date.localeCompare(b.match.date)||priority(b.tournament.definition.kind)-priority(a.tournament.definition.kind));
  const occupied=fixedCupOccupancy(state);
  for(const item of all){
    const keys=cupKeys(item.match),scheduled=item.match.date,blocked=isClubDateBlockedByInternationalWindow(scheduled,state.year),overdue=scheduled<state.currentDate,conflict=blocked||overdue||nearAny(occupied,keys,scheduled,MIN_CLUB_GAP);
    if(conflict){
      const start=scheduled<state.currentDate?state.currentDate:scheduled;
      const chosen=nextSafeDate(start,candidate=>candidate>=state.currentDate&&!isClubDateBlockedByInternationalWindow(candidate,state.year)&&!nearAny(occupied,keys,candidate,MIN_CLUB_GAP));
      if(chosen!==scheduled){item.match.originalDate=item.match.originalDate??scheduled;item.match.date=chosen;item.match.roundDue=roundForDate(state,chosen);item.match.rescheduledReason=blocked?`${internationalReason(state,scheduled)} Partida de clubes reagendada.`:overdue?"Partida atrasada reposicionada para a próxima janela válida do calendário.":"Conflito de calendário: foi preservado um intervalo mínimo entre compromissos do clube.";}
    }
    for(const key of keys)addOccupied(occupied,key,item.match.date);
  }
}

function mainClubKey(state:SeasonState,id:string){const club=state.league.clubs.find(item=>item.id===id);return club?`active:${club.id}`:`name:${normalize(id)}`;}
function coordinateMainLeague(state:SeasonState){
  const cups=cupIndex(state),clubDates=new Map<string,string[]>();
  for(const fixture of state.league.fixtures.filter(item=>item.played&&Boolean(item.date))){addOccupied(clubDates,mainClubKey(state,fixture.homeClubId),fixture.date);addOccupied(clubDates,mainClubKey(state,fixture.awayClubId),fixture.date);}
  const pending=state.league.fixtures.filter(item=>!item.played&&Boolean(item.date)).sort((a,b)=>a.round-b.round||(a.date??"").localeCompare(b.date??"")||a.id.localeCompare(b.id));
  for(const fixture of pending){
    const scheduled=fixture.date!;
    const keys=[mainClubKey(state,fixture.homeClubId),mainClubKey(state,fixture.awayClubId)];
    const latest=latestOccupied(clubDates,keys);
    let start=scheduled<state.currentDate?state.currentDate:scheduled;
    if(latest){const orderedStart=dateAdd(latest,MIN_CLUB_GAP);if(orderedStart>start)start=orderedStart;}
    const blocked=isClubDateBlockedByInternationalWindow(scheduled,state.year),overdue=scheduled<state.currentDate,leagueConflict=nearAny(clubDates,keys,scheduled,MIN_CLUB_GAP),cupConflict=nearAny(cups,keys,scheduled,MIN_CLUB_GAP),outOfOrder=Boolean(latest&&scheduled<dateAdd(latest,MIN_CLUB_GAP));
    const conflict=blocked||overdue||leagueConflict||cupConflict||outOfOrder;
    let chosen=scheduled;
    if(conflict)chosen=nextSafeDate(start,candidate=>candidate>=state.currentDate&&!isClubDateBlockedByInternationalWindow(candidate,state.year)&&!nearAny(cups,keys,candidate,MIN_CLUB_GAP)&&!nearAny(clubDates,keys,candidate,MIN_CLUB_GAP));
    if(chosen!==scheduled){
      fixture.originalDate=fixture.originalDate??scheduled;
      fixture.date=chosen;
      fixture.rescheduledReason=blocked?`${internationalReason(state,scheduled)} Partida remarcada.`:overdue?"Partida atrasada remarcada para a próxima data válida, respeitando a ordem das rodadas.":"Partida remarcada para evitar sobreposição e garantir intervalo entre compromissos do clube.";
    }
    for(const key of keys)addOccupied(clubDates,key,fixture.date);
  }
}

function parallelKeys(league:{teams:Array<{id:string;name:string}>},fixture:LeagueFixture){const names=[league.teams.find(team=>team.id===fixture.homeClubId)?.name,league.teams.find(team=>team.id===fixture.awayClubId)?.name].filter(Boolean) as string[];return names.map(name=>`name:${normalize(name)}`);}
function coordinateParallelLeagues(state:SeasonState){
  const cups=cupIndex(state);
  for(const league of Object.values(state.worldLeagues.leagues)){
    if(!league)continue;
    const clubDates=new Map<string,string[]>();
    for(const fixture of league.fixtures.filter(item=>item.played&&Boolean(item.date))){for(const key of parallelKeys(league,fixture))addOccupied(clubDates,key,fixture.date);}
    for(const fixture of league.fixtures.filter(item=>!item.played).sort((a,b)=>(a.date??"").localeCompare(b.date??"")||a.round-b.round)){
      if(!fixture.date)continue;
      const keys=parallelKeys(league,fixture),scheduled=fixture.date,latest=latestOccupied(clubDates,keys);let start=scheduled<state.currentDate?state.currentDate:scheduled;if(latest){const orderedStart=dateAdd(latest,MIN_CLUB_GAP);if(orderedStart>start)start=orderedStart;}
      const blocked=isClubDateBlockedByInternationalWindow(scheduled,state.year),conflict=blocked||scheduled<state.currentDate||nearAny(cups,keys,scheduled,MIN_CLUB_GAP)||nearAny(clubDates,keys,scheduled,MIN_CLUB_GAP)||Boolean(latest&&scheduled<dateAdd(latest,MIN_CLUB_GAP));let date=scheduled;
      if(conflict)date=nextSafeDate(start,candidate=>candidate>=state.currentDate&&!isClubDateBlockedByInternationalWindow(candidate,state.year)&&!nearAny(cups,keys,candidate,MIN_CLUB_GAP)&&!nearAny(clubDates,keys,candidate,MIN_CLUB_GAP));
      if(date!==scheduled){fixture.originalDate=fixture.originalDate??scheduled;fixture.date=date;fixture.rescheduledReason=blocked?`${internationalReason(state,scheduled)} Liga remarcada.`:"Partida de liga remarcada para preservar intervalo e ordem dos compromissos.";}
      for(const key of keys)addOccupied(clubDates,key,fixture.date);
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
 coordinateParallelLeagues(state);
 const roundDates=new Map<number,string>();for(const fixture of state.league.fixtures.filter(f=>Boolean(f.date))){const current=roundDates.get(fixture.round);if(!current||fixture.date!<current)roundDates.set(fixture.round,fixture.date!);}state.worldCompetitions.roundDates=[...roundDates].map(([round,date])=>({round,date})).sort((a,b)=>a.date.localeCompare(b.date));
 return state;
}
