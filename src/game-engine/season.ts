import { SeededRng } from "./rng";
import { createLeague, generateFixtures, sortedStandings, type LeagueClub, type LeagueFixture, type LeaguePlayer, type LeagueWorld } from "./league";
import { DEFAULT_TACTIC, pickStartingXI, simulateMatch, type MatchResult, type MatchTactic } from "./match";
import { applyPeopleAfterMatch } from "./people";
import { createLivingWorld, resolveWorldEvent, worldAfterDay, worldAfterMatch, type LivingWorldState } from "./world-events";
import { createMarketState, prepareNextMarketSeason, processMarketRound, type MarketState } from "./market";
import { applyNarrativeDay } from "./narrative";
import { applyCareerChoice, careerAfterRound, createManagerCareer, type ManagerCareerState } from "./career";
import { createClubManagementState, hydrateClubManagement, prepareNextClubManagementSeason, processClubManagementRound, type ClubManagementState } from "./club-management";
import { competitionStartDate, professionalCompetitionById, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";

export const SEASON_SAVE_KEY="vestiario90:season:v5";
export const TOTAL_ROUNDS=38;

export type RecentResult="V"|"E"|"D";
export type StoredUserMatch={fixtureId:string;homeClubId:string;awayClubId:string;result:MatchResult};
export type SeasonState={
  baseSeed:string;
  year:number;
  league:LeagueWorld;
  currentRound:number;
  selectedClubId:string;
  lineupIds:string[];
  recentForm:RecentResult[];
  completed:boolean;
  livingWorld:LivingWorldState;
  market:MarketState;
  career:ManagerCareerState;
  clubManagement:ClubManagementState;
  competitionId:ProfessionalCompetitionId;
  currentDate:string;
  championClubId?:string;
  lastUserMatch?:StoredUserMatch;
};

function cloneLeague(league:LeagueWorld):LeagueWorld{
  return{
    ...league,
    clubs:league.clubs.map(club=>({...club,players:club.players.map(player=>({...player,contract:{...player.contract},promises:(player.promises??[]).map(promise=>({...promise}))}))})),
    fixtures:league.fixtures.map(fixture=>({...fixture})),
    standings:league.standings.map(standing=>({...standing})),
  };
}

function refreshStatus(player:LeaguePlayer,isSelected:boolean){
  if(player.injuryDays>0)player.status=`Lesionado (${player.injuryDays}d)`;
  else if(player.suspensionMatches>0)player.status=`Suspenso (${player.suspensionMatches})`;
  else player.status=isSelected?"Titular":player.squadRole??"Rotação";
}

function defaultLineup(club:LeagueClub):string[]{return pickStartingXI(club).map(p=>p.id);}
function addIsoDays(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}

export function createSeason(baseSeed:string,year=2026,selectedClubId="club-1",competitionId:ProfessionalCompetitionId="BRA1"):SeasonState{
  const league=createLeague(`${baseSeed}:${year}:${competitionId}`,year,competitionId);
  const club=league.clubs.find(c=>c.id===selectedClubId)??league.clubs[0];
  const lineupIds=defaultLineup(club);
  club.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id)));
  const firstDate=league.fixtures.find(f=>f.round===1)?.date??competitionStartDate(competitionId,year);
  return{baseSeed,year,league,currentRound:1,selectedClubId:club.id,lineupIds,recentForm:[],completed:false,livingWorld:createLivingWorld(club.name),market:createMarketState(),career:createManagerCareer(club,year),clubManagement:createClubManagementState(league,baseSeed,year),competitionId,currentDate:addIsoDays(firstDate,-7)};
}

export function getSelectedClub(state:SeasonState):LeagueClub{return state.league.clubs.find(c=>c.id===state.selectedClubId)??state.league.clubs[0];}

export function getCurrentUserFixture(state:SeasonState):LeagueFixture|undefined{
  if(state.career?.status==="Sem clube")return undefined;
  return state.league.fixtures.find(f=>f.round===state.currentRound&&(f.homeClubId===state.selectedClubId||f.awayClubId===state.selectedClubId));
}

export function getUserFixtures(state:SeasonState):LeagueFixture[]{
  return state.league.fixtures.filter(f=>f.homeClubId===state.selectedClubId||f.awayClubId===state.selectedClubId).sort((a,b)=>a.round-b.round);
}

function updateStanding(league:LeagueWorld,fixture:LeagueFixture,result:MatchResult){
  const home=league.standings.find(s=>s.clubId===fixture.homeClubId)!;
  const away=league.standings.find(s=>s.clubId===fixture.awayClubId)!;
  home.played++;away.played++;
  home.goalsFor+=result.homeGoals;home.goalsAgainst+=result.awayGoals;
  away.goalsFor+=result.awayGoals;away.goalsAgainst+=result.homeGoals;
  if(result.homeGoals>result.awayGoals){home.won++;away.lost++;home.points+=3;}
  else if(result.homeGoals<result.awayGoals){away.won++;home.lost++;away.points+=3;}
  else{home.drawn++;away.drawn++;home.points++;away.points++;}
}

function resultMoodDelta(goalsFor:number,goalsAgainst:number){return goalsFor>goalsAgainst?3:goalsFor<goalsAgainst?-2:1;}

function applyPlayerEffects(club:LeagueClub,result:MatchResult,side:"home"|"away",participatingIds:string[]|undefined,seed:string){
  const rng=new SeededRng(seed);
  const participants=participatingIds?.length?club.players.filter(p=>participatingIds.includes(p.id)):pickStartingXI(club);
  const participantIds=new Set(participants.map(p=>p.id));
  const goalsFor=side==="home"?result.homeGoals:result.awayGoals;
  const goalsAgainst=side==="home"?result.awayGoals:result.homeGoals;
  const moraleDelta=resultMoodDelta(goalsFor,goalsAgainst);
  for(const player of club.players){
    if(player.suspensionMatches>0&&!participantIds.has(player.id))player.suspensionMatches=Math.max(0,player.suspensionMatches-1);
    if(participantIds.has(player.id)){
      player.condition=Math.max(45,player.condition-rng.integer(6,14));
      player.fatigue=Math.min(100,player.fatigue+rng.integer(8,16));
      player.morale=Math.max(0,Math.min(100,player.morale+moraleDelta+rng.integer(-1,1)));
      player.form=Math.max(1,Math.min(10,player.form+(goalsFor>goalsAgainst?.3:goalsFor<goalsAgainst?-.25:.05)));
    }else{
      player.condition=Math.min(100,player.condition+1);
      player.fatigue=Math.max(0,player.fatigue-2);
    }
  }
  const teamEvents=result.events.filter(event=>event.team===side&&event.playerId);
  for(const event of teamEvents){
    const player=club.players.find(p=>p.id===event.playerId);
    if(!player)continue;
    if(event.type==="goal")player.goals++;
    if(event.type==="card"){
      player.yellowCards++;
      if(player.yellowCards>=3){player.yellowCards=0;player.suspensionMatches=1;}
    }
    if(event.type==="injury")player.injuryDays=Math.max(player.injuryDays,rng.integer(3,14));
  }
}

export function playCurrentRound(
  state:SeasonState,
  userTactic:MatchTactic=DEFAULT_TACTIC,
  userMatchOverride?:MatchResult,
  userParticipantIds?:string[],
):SeasonState{
  if(state.completed)return state;
  const league=cloneLeague(state.league);
  const managerEmployed=state.career?.status!=="Sem clube";
  const roundFixtures=league.fixtures.filter(f=>f.round===state.currentRound&&!f.played);
  let lastUserMatch:StoredUserMatch|undefined;
  for(const fixture of roundFixtures){
    const home=league.clubs.find(c=>c.id===fixture.homeClubId)!;
    const away=league.clubs.find(c=>c.id===fixture.awayClubId)!;
    const userHome=managerEmployed&&home.id===state.selectedClubId,userAway=managerEmployed&&away.id===state.selectedClubId;
    const isUserFixture=userHome||userAway;
    const result=isUserFixture&&userMatchOverride?userMatchOverride:simulateMatch(
      home,
      away,
      `${state.baseSeed}:${state.year}:r${state.currentRound}:${fixture.id}`,
      userHome?userTactic:DEFAULT_TACTIC,
      userAway?userTactic:DEFAULT_TACTIC,
      userHome?state.lineupIds:undefined,
      userAway?state.lineupIds:undefined,
    );
    fixture.played=true;fixture.homeGoals=result.homeGoals;fixture.awayGoals=result.awayGoals;
    updateStanding(league,fixture,result);
    applyPlayerEffects(home,result,"home",userHome?(userParticipantIds??state.lineupIds):undefined,`${fixture.id}:home`);
    applyPlayerEffects(away,result,"away",userAway?(userParticipantIds??state.lineupIds):undefined,`${fixture.id}:away`);
    if(isUserFixture){
      const userClub=userHome?home:away;
      applyPeopleAfterMatch(userClub,userParticipantIds??state.lineupIds,state.lineupIds,state.currentRound);
      lastUserMatch={fixtureId:fixture.id,homeClubId:home.id,awayClubId:away.id,result};
    }
  }
  const userResult=lastUserMatch?.result;
  const userHome=lastUserMatch?.homeClubId===state.selectedClubId;
  const gf=userResult?(userHome?userResult.homeGoals:userResult.awayGoals):0;
  const ga=userResult?(userHome?userResult.awayGoals:userResult.homeGoals):0;
  const recentForm=[...(state.recentForm??[])];
  if(userResult)recentForm.push(gf>ga?"V":gf<ga?"D":"E");
  while(recentForm.length>5)recentForm.shift();
  const totalRounds=league.totalRounds??Math.max(...league.fixtures.map(f=>f.round),TOTAL_ROUNDS);
  const completed=state.currentRound>=totalRounds;
  const championClubId=completed?sortedStandings(league)[0]?.clubId:undefined;
  const nextRound=completed?totalRounds+1:state.currentRound+1;
  const selectedClub=league.clubs.find(c=>c.id===state.selectedClubId)!;
  const validLineup=state.lineupIds.filter(id=>{
    const p=selectedClub.players.find(player=>player.id===id);
    return Boolean(p&&p.injuryDays===0&&p.suspensionMatches===0);
  });
  const lineupIds=[...validLineup];
  for(const player of [...selectedClub.players].sort((a,b)=>b.overall-a.overall)){
    if(lineupIds.length>=11)break;
    if(player.injuryDays===0&&player.suspensionMatches===0&&!lineupIds.includes(player.id))lineupIds.push(player.id);
  }
  selectedClub.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id)));
  let livingWorld=userResult?worldAfterMatch(state.livingWorld??createLivingWorld(selectedClub.name),selectedClub,state.currentRound,gf,ga):(state.livingWorld??createLivingWorld(selectedClub.name));
  const careerResult=careerAfterRound(state.career??createManagerCareer(selectedClub,state.year),league,livingWorld,state.currentRound,state.year,state.baseSeed,userResult?{goalsFor:gf,goalsAgainst:ga}:undefined);
  livingWorld=careerResult.world;
  const nextState={...state,league,currentRound:nextRound,lineupIds,recentForm,completed,championClubId,lastUserMatch,livingWorld,career:careerResult.career};
  return processMarketRound(processClubManagementRound(nextState));
}

export function advanceSeasonDay(state:SeasonState,calendarDay=1):SeasonState{
  const league=cloneLeague(state.league);
  const club=league.clubs.find(c=>c.id===state.selectedClubId)!;
  for(const currentClub of league.clubs){
    for(const player of currentClub.players){
      if(player.injuryDays>0)player.injuryDays--;
      player.condition=Math.min(100,player.condition+3);
      player.fatigue=Math.max(0,player.fatigue-4);
      if(player.injuryDays===0&&player.morale<95)player.morale++;
    }
  }
  club.players.forEach(player=>refreshStatus(player,state.lineupIds.includes(player.id)));
  let livingWorld=state.livingWorld??createLivingWorld(club.name);
  if(state.career?.status!=="Sem clube"){
    livingWorld=worldAfterDay(livingWorld,club,state.currentRound,state.baseSeed);
    livingWorld=applyNarrativeDay(livingWorld,{day:calendarDay,round:state.currentRound,selectedClubId:state.selectedClubId,seed:state.baseSeed,league});
  }
  return processMarketRound({...state,league,livingWorld});
}

export type CalendarRoute="matchday"|"inbox"|"club"|null;
export type CalendarAdvanceResult={state:SeasonState;route:CalendarRoute;reason:string};

export function getTodayUserFixture(state:SeasonState):LeagueFixture|undefined{
  return getUserFixtures(state).find(f=>!f.played&&f.date===state.currentDate);
}

export function advanceCalendarDay(state:SeasonState):CalendarAdvanceResult{
  const todayMatch=getTodayUserFixture(state);
  if(todayMatch)return{state,route:"matchday",reason:"Hoje é dia de jogo. A comissão já encaminhou você para a preparação da partida."};
  const current=state.currentDate??state.league.fixtures.find(f=>!f.played)?.date??`${state.year}-01-01`;
  const nextDate=addIsoDays(current,1);
  const dayNumber=Math.max(1,Math.floor((new Date(`${nextDate}T12:00:00Z`).getTime()-new Date(`${state.year}-01-01T12:00:00Z`).getTime())/86400000)+1);
  const next=advanceSeasonDay({...state,currentDate:nextDate},dayNumber);
  if(getTodayUserFixture(next))return{state:next,route:"matchday",reason:"Hoje é dia de jogo. Vá para a preparação da partida."};
  const pending=next.livingWorld.inbox.find(event=>event.unread&&!event.resolved);
  if(pending?.kind==="Diretoria")return{state:next,route:"club",reason:`A diretoria precisa de você: ${pending.title}.`};
  if(pending)return{state:next,route:"inbox",reason:`Há uma decisão pendente: ${pending.title}.`};
  return{state:next,route:null,reason:"Dia avançado. Nenhuma decisão obrigatória surgiu."};
}

export function resolveSeasonWorldChoice(state:SeasonState,eventId:string,choiceId:string){
  const club=getSelectedClub(state);
  const event=state.livingWorld.inbox.find(item=>item.id===eventId),choice=event?.choices.find(item=>item.id===choiceId);
  const resolved=resolveWorldEvent(state.livingWorld,club,eventId,choiceId);
  const league={...state.league,clubs:state.league.clubs.map(current=>current.id===club.id?resolved.club:current)};
  let next:SeasonState={...state,league,livingWorld:resolved.world};
  if(!choice?.careerAction)return{state:next,message:resolved.message};
  const careerResult=applyCareerChoice(state.career??createManagerCareer(club,state.year),league,resolved.world,choice,state.currentRound,state.year,state.baseSeed);
  next={...next,career:careerResult.career,livingWorld:careerResult.world};
  if(careerResult.nextClubId){
    const newClub=league.clubs.find(current=>current.id===careerResult.nextClubId);
    if(newClub){const lineupIds=defaultLineup(newClub);newClub.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id)));next={...next,selectedClubId:newClub.id,lineupIds,recentForm:[],lastUserMatch:undefined};}
  }
  return{state:next,message:careerResult.message};
}

export function toggleLineupPlayer(state:SeasonState,playerId:string):SeasonState{
  const club=getSelectedClub(state);
  const player=club.players.find(p=>p.id===playerId);
  if(!player||player.injuryDays>0||player.suspensionMatches>0)return state;
  const selected=state.lineupIds.includes(playerId);
  if(selected)return{...state,lineupIds:state.lineupIds.filter(id=>id!==playerId)};
  if(state.lineupIds.length>=11)return state;
  return{...state,lineupIds:[...state.lineupIds,playerId]};
}

export function startNextSeason(state:SeasonState):SeasonState{
  if(!state.completed)return state;
  const nextYear=state.year+1;
  const league=cloneLeague(state.league);
  const prepared=prepareNextMarketSeason(state,nextYear,league);
  for(const currentClub of prepared.league.clubs){
    currentClub.transferBudgetEur+=Math.max(2_000_000,Math.round(currentClub.marketValueEur*.04/100_000)*100_000);
    currentClub.wageBudgetBrlMonthly=Math.round(currentClub.wageBudgetBrlMonthly*1.05/10_000)*10_000;
  }
  const competitionId=state.competitionId??state.league.competitionId??"BRA1",competition=professionalCompetitionById(competitionId);
  prepared.league.fixtures=generateFixtures(prepared.league.clubs.map(c=>c.id),competitionStartDate(competitionId,nextYear),competition.roundCadenceDays,competition.doubleRoundRobin);
  prepared.league.competitionId=competitionId;prepared.league.competitionName=competition.name;prepared.league.totalRounds=Math.max(...prepared.league.fixtures.map(f=>f.round),0);
  prepared.league.standings=prepared.league.clubs.map(c=>({clubId:c.id,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0}));
  const club=prepared.league.clubs.find(c=>c.id===state.selectedClubId)??prepared.league.clubs[0];
  const lineupIds=defaultLineup(club);club.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id)));
  const livingWorld=state.career?.status==="Sem clube"?{...state.livingWorld,lastDailyRound:undefined,lastNarrativeDay:undefined}:createLivingWorld(club.name);livingWorld.managerReputation=state.livingWorld?.managerReputation??livingWorld.managerReputation;
  const clubManagement=prepareNextClubManagementSeason(state,nextYear,prepared.league);
  const firstDate=prepared.league.fixtures.find(f=>f.round===1)?.date??competitionStartDate(competitionId,nextYear);
  return{...state,year:nextYear,league:prepared.league,currentRound:1,lineupIds,recentForm:[],completed:false,championClubId:undefined,lastUserMatch:undefined,livingWorld,market:prepared.market,career:state.career??createManagerCareer(club,nextYear),clubManagement,competitionId,currentDate:addIsoDays(firstDate,-7)};
}

export function saveSeasonLocal(state:SeasonState):void{if(typeof window!=="undefined")window.localStorage.setItem(SEASON_SAVE_KEY,JSON.stringify(state));}

export function hydrateSeasonState(parsed:SeasonState):SeasonState{
  const competitionId=(parsed.competitionId??parsed.league?.competitionId??"BRA1") as ProfessionalCompetitionId;
  const competition=professionalCompetitionById(competitionId),year=parsed.year??2026;
  parsed.competitionId=competitionId;parsed.league.competitionId=competitionId;parsed.league.competitionName=competition.name;
  if(parsed.league.fixtures.some(f=>!f.date)){
    const dated=generateFixtures(parsed.league.clubs.map(c=>c.id),competitionStartDate(competitionId,year),competition.roundCadenceDays,competition.doubleRoundRobin);
    const dateByRound=new Map(dated.map(f=>[f.round,f.date]));
    parsed.league.fixtures=parsed.league.fixtures.map(f=>({...f,date:f.date??dateByRound.get(f.round)}));
  }
  parsed.league.totalRounds=parsed.league.totalRounds??Math.max(...parsed.league.fixtures.map(f=>f.round),0);
  if(!parsed.currentDate){const next=parsed.league.fixtures.find(f=>!f.played&&f.round===parsed.currentRound)?.date??parsed.league.fixtures.find(f=>!f.played)?.date??competitionStartDate(competitionId,year);parsed.currentDate=addIsoDays(next,-1);}
  if(!parsed.career){const club=parsed.league.clubs.find(c=>c.id===parsed.selectedClubId)??parsed.league.clubs[0];parsed.career=createManagerCareer(club,year);}
  if(!parsed.clubManagement)parsed.clubManagement=hydrateClubManagement(parsed);
  return parsed;
}

export function loadSeasonLocal():SeasonState|null{
  if(typeof window==="undefined")return null;
  try{const raw=window.localStorage.getItem(SEASON_SAVE_KEY);if(!raw)return null;const parsed=JSON.parse(raw) as SeasonState;if(!parsed?.baseSeed||!parsed.league?.clubs?.length||!Array.isArray(parsed.lineupIds)||!parsed.livingWorld||!parsed.market)return null;return hydrateSeasonState(parsed);}catch{return null;}
}
