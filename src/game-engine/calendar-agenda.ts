import { professionalCompetitionById } from "../data/brazil-2026/competitions";
import { internationalWindowsForSeason, nationalSpectatorResult, worldNationalFixturesForSeason, type NationalWorldFixture } from "./international-calendar";
import type { SeasonState } from "./season";

export type CalendarAgendaKind="Liga"|"Copa"|"Seleção";
export type CalendarAgendaMatch={
 id:string;
 date:string;
 competition:string;
 stage:string;
 kind:CalendarAgendaKind;
 homeName:string;
 awayName:string;
 homeLogo?:string;
 awayLogo?:string;
 played:boolean;
 score?:string;
 status:string;
 isUserClub?:boolean;
 isManagedNation?:boolean;
 nationalFixtureId?:string;
 aggregate?:string;
 decidedByPenalties?:boolean;
 rescheduledReason?:string;
 originalDate?:string;
};

export type CalendarAgendaWindow={id:string;startDate:string;endDate:string;label:string;competition:string;reason:string;longBreak:boolean};
export type CalendarAgenda={myGames:CalendarAgendaMatch[];allGames:CalendarAgendaMatch[];windows:CalendarAgendaWindow[];nationalFixtures:NationalWorldFixture[]};

const sortMatches=(items:CalendarAgendaMatch[])=>[...items].sort((a,b)=>a.date.localeCompare(b.date)||Number(Boolean(b.isUserClub))-Number(Boolean(a.isUserClub))||a.competition.localeCompare(b.competition)||a.id.localeCompare(b.id));
const normalizeName=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|cf|ec|sc|afc|club|clube)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();

function cupAggregate(tournament:SeasonState["worldCompetitions"]["tournaments"][number],match:SeasonState["worldCompetitions"]["tournaments"][number]["matches"][number]){
 if(!match.tieId)return undefined;
 const stage=tournament.definition.stages.find(item=>item.name===match.stage);
 if(stage?.legs!==2)return undefined;
 const played=tournament.matches.filter(item=>item.tieId===match.tieId&&item.played&&item.homeGoals!==undefined&&item.awayGoals!==undefined);
 if(!played.length)return undefined;
 let homeTotal=0,awayTotal=0;
 for(const item of played){
  if(item.home.id===match.home.id)homeTotal+=item.homeGoals??0;
  if(item.away.id===match.home.id)homeTotal+=item.awayGoals??0;
  if(item.home.id===match.away.id)awayTotal+=item.homeGoals??0;
  if(item.away.id===match.away.id)awayTotal+=item.awayGoals??0;
 }
 return `${played.length>=2?"Agregado":"Agregado parcial"} ${homeTotal}–${awayTotal}`;
}

export function buildCalendarAgenda(season:SeasonState):CalendarAgenda{
 const userClubId=season.selectedClubId,mainCompetition=professionalCompetitionById(season.competitionId??season.league.competitionId??"BRA1"),all:CalendarAgendaMatch[]=[];
 const mainClubs=new Map(season.league.clubs.map(club=>[club.id,club])),logoByName=new Map<string,string>();
 for(const club of season.league.clubs)logoByName.set(normalizeName(club.name),club.imageUrl);
 for(const parallel of Object.values(season.worldLeagues?.leagues??{}))if(parallel)for(const team of parallel.teams)logoByName.set(normalizeName(team.name),team.imageUrl);
 for(const fixture of season.league.fixtures){
  if(!fixture.date)continue;
  const home=mainClubs.get(fixture.homeClubId),away=mainClubs.get(fixture.awayClubId);if(!home||!away)continue;
  const played=Boolean(fixture.played&&fixture.homeGoals!==undefined&&fixture.awayGoals!==undefined);
  all.push({id:`league-${mainCompetition.id}-${fixture.id}`,date:fixture.date,competition:mainCompetition.shortName??mainCompetition.name,stage:`Rodada ${fixture.round}`,kind:"Liga",homeName:home.name,awayName:away.name,homeLogo:home.imageUrl,awayLogo:away.imageUrl,played,score:played?`${fixture.homeGoals} × ${fixture.awayGoals}`:undefined,status:played?"Final":fixture.date===season.currentDate?"Hoje":"Agendado",isUserClub:home.id===userClubId||away.id===userClubId,originalDate:fixture.originalDate,rescheduledReason:fixture.rescheduledReason});
 }
 for(const parallel of Object.values(season.worldLeagues?.leagues??{})){
  if(!parallel)continue;
  const teams=new Map(parallel.teams.map(team=>[team.id,team]));
  for(const fixture of parallel.fixtures){
   if(!fixture.date)continue;const home=teams.get(fixture.homeClubId),away=teams.get(fixture.awayClubId);if(!home||!away)continue;
   const played=Boolean(fixture.played&&fixture.homeGoals!==undefined&&fixture.awayGoals!==undefined);
   all.push({id:`parallel-${parallel.competitionId}-${fixture.id}`,date:fixture.date,competition:parallel.shortName,stage:`Rodada ${fixture.round}`,kind:"Liga",homeName:home.name,awayName:away.name,homeLogo:home.imageUrl,awayLogo:away.imageUrl,played,score:played?`${fixture.homeGoals} × ${fixture.awayGoals}`:undefined,status:played?"Final":fixture.date===season.currentDate?"Hoje":"Agendado"});
  }
 }
 for(const tournament of season.worldCompetitions?.tournaments??[]){
  for(const match of tournament.matches){
   const played=Boolean(match.played&&match.homeGoals!==undefined&&match.awayGoals!==undefined),isUser=match.home.activeClubId===userClubId||match.away.activeClubId===userClubId;
   const homeClub=match.home.activeClubId?mainClubs.get(match.home.activeClubId):undefined,awayClub=match.away.activeClubId?mainClubs.get(match.away.activeClubId):undefined;
   all.push({id:`cup-${tournament.definition.id}-${match.id}`,date:match.date,competition:tournament.definition.shortName,stage:match.stage,kind:"Copa",homeName:match.home.name,awayName:match.away.name,homeLogo:homeClub?.imageUrl??logoByName.get(normalizeName(match.home.name)),awayLogo:awayClub?.imageUrl??logoByName.get(normalizeName(match.away.name)),played,score:played?`${match.homeGoals} × ${match.awayGoals}`:undefined,status:played?"Final":match.date===season.currentDate?"Hoje":"Agendado",isUserClub:isUser,aggregate:cupAggregate(tournament,match),decidedByPenalties:match.decidedByPenalties,originalDate:match.originalDate,rescheduledReason:match.rescheduledReason});
  }
 }
 const nationalFixtures=worldNationalFixturesForSeason(season.year,season.baseSeed);
 for(const fixture of nationalFixtures){
  const available=fixture.date<=season.currentDate,result=available?nationalSpectatorResult(fixture,season.baseSeed):undefined;
  all.push({id:`national-${fixture.id}`,date:fixture.date,competition:fixture.competition,stage:fixture.stage,kind:"Seleção",homeName:fixture.homeName,awayName:fixture.awayName,played:available,score:result?`${result.homeGoals} × ${result.awayGoals}`:undefined,status:available?"Final":fixture.date===season.currentDate?"Hoje":"Agendado",nationalFixtureId:fixture.id});
 }
 for(const fixture of season.nationalCareer?.fixtures??[]){
  const duplicate=all.find(item=>item.kind==="Seleção"&&item.date===fixture.date&&item.homeName===fixture.homeName&&item.awayName===fixture.awayName);
  if(duplicate){duplicate.isManagedNation=true;continue;}
  all.push({id:`managed-national-${fixture.id}`,date:fixture.date,competition:fixture.competition,stage:fixture.stage,kind:"Seleção",homeName:fixture.homeName,awayName:fixture.awayName,played:Boolean(fixture.played),score:fixture.played?`${fixture.homeGoals??0} × ${fixture.awayGoals??0}`:undefined,status:fixture.played?"Final":fixture.date===season.currentDate?"Hoje":"Agendado",isManagedNation:true});
 }
 const unique=new Map<string,CalendarAgendaMatch>();for(const item of all)if(!unique.has(item.id))unique.set(item.id,item);
 const allGames=sortMatches([...unique.values()]),myGames=sortMatches(allGames.filter(item=>item.isUserClub||item.isManagedNation));
 const windows=internationalWindowsForSeason(season.year).map(window=>({id:window.id,startDate:window.startDate,endDate:window.endDate,label:window.label,competition:window.competition,reason:window.reason,longBreak:window.longBreak}));
 return{myGames,allGames,windows,nationalFixtures};
}

export function compactAgendaMatches(matches:CalendarAgendaMatch[],currentDate:string,visibleFutureMatches:number,recentMatches=0){
 const sorted=sortMatches(matches),future=sorted.filter(item=>item.date>=currentDate).slice(0,Math.max(1,visibleFutureMatches));
 const recent=recentMatches>0?sorted.filter(item=>item.date<currentDate).slice(-recentMatches):[];
 return[...recent,...future];
}

export function agendaRemainingFutureMatches(matches:CalendarAgendaMatch[],currentDate:string,visibleFutureMatches:number){const total=matches.filter(item=>item.date>=currentDate).length;return Math.max(0,total-Math.max(1,visibleFutureMatches));}
