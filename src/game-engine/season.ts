import { SeededRng } from "./rng";
import { createLeague, generateFixtures, sortedStandings, type LeagueClub, type LeagueFixture, type LeaguePlayer, type LeagueWorld } from "./league";
import { DEFAULT_TACTIC, pickStartingXI, simulateMatch, type MatchResult, type MatchTactic } from "./match";
import { applyPeopleAfterMatch } from "./people";
import { createLivingWorld, resolveWorldEvent, worldAfterDay, worldAfterMatch, type LivingWorldState } from "./world-events";
import { createMarketState, prepareNextMarketSeason, processMarketRound, type MarketState } from "./market";
import { applyNarrativeDay } from "./narrative";
import { applyCareerChoice, careerAfterRound, createManagerCareer, type ManagerCareerState } from "./career";
import { createClubManagementState, hydrateClubManagement, prepareNextClubManagementSeason, processClubManagementRound, type ClubManagementState } from "./club-management";
import { applySportingStatsAndDevelopment, preparePlayerDevelopmentNextSeason } from "./development";
import { answerMediaSession, createMediaWorld, hydrateMediaWorld, mediaAfterMatch, mediaBeforeRound, pendingMediaSessions, type MediaWorldState } from "./media-world";
import { competitionStartDate, professionalCompetitionById, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";
import { createClubAiState, hydrateClubAi, prepareClubAiNextSeason, processClubAiRound, tacticForClub, type ClubAiState } from "./club-ai";
import { createWorldCompetitions, hydrateWorldCompetitions, prepareWorldCompetitionsNextSeason, processWorldCompetitions, type WorldCompetitionsState } from "./world-competitions";
import { createInternationalMarket, hydrateInternationalMarket, prepareInternationalMarketNextSeason, processInternationalMarketRound, type InternationalMarketState } from "./international-market";

export const SEASON_SAVE_KEY="vestiario90:season:v5";
export const TOTAL_ROUNDS=38;

export type RecentResult="V"|"E"|"D";
export type MatchdayRole="starter"|"bench"|"out";
export type StoredUserMatch={fixtureId:string;homeClubId:string;awayClubId:string;result:MatchResult};
export type SeasonState={
  baseSeed:string;
  year:number;
  league:LeagueWorld;
  currentRound:number;
  selectedClubId:string;
  lineupIds:string[];
  benchIds:string[];
  recentForm:RecentResult[];
  completed:boolean;
  livingWorld:LivingWorldState;
  mediaWorld:MediaWorldState;
  market:MarketState;
  career:ManagerCareerState;
  clubManagement:ClubManagementState;
  clubAi:ClubAiState;
  worldCompetitions:WorldCompetitionsState;
  internationalMarket:InternationalMarketState;
  competitionId:ProfessionalCompetitionId;
  currentDate:string;
  championClubId?:string;
  lastUserMatch?:StoredUserMatch;
};

function cloneLeague(league:LeagueWorld):LeagueWorld{
  return{
    ...league,
    clubs:league.clubs.map(club=>({...club,players:club.players.map(player=>({...player,contract:{...player.contract},overallHistory:(player.overallHistory??[]).map(point=>({...point})),promises:(player.promises??[]).map(promise=>({...promise}))}))})),
    fixtures:league.fixtures.map(fixture=>({...fixture})),
    standings:league.standings.map(standing=>({...standing})),
  };
}

function refreshStatus(player:LeaguePlayer,isStarter:boolean,isBench=false){
  if(player.injuryDays>0)player.status=`Lesionado (${player.injuryDays}d)`;
  else if(player.suspensionMatches>0)player.status=`Suspenso (${player.suspensionMatches})`;
  else player.status=isStarter?"Titular":isBench?"Banco":"Fora";
}
function availablePlayers(club:LeagueClub){return club.players.filter(player=>player.injuryDays===0&&player.suspensionMatches===0);}
function defaultLineup(club:LeagueClub):string[]{return pickStartingXI(club).map(p=>p.id);}
function defaultBench(club:LeagueClub,lineupIds:string[],size:number):string[]{const starters=new Set(lineupIds);return availablePlayers(club).filter(player=>!starters.has(player.id)).sort((a,b)=>b.overall-a.overall).slice(0,size).map(player=>player.id);}
function addIsoDays(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
function matchdayLimit(state:SeasonState){return professionalCompetitionById(state.competitionId??state.league.competitionId??"BRA1").benchSize;}
export function requiredBenchCount(state:SeasonState){const club=getSelectedClub(state),available=availablePlayers(club).length;return Math.max(0,Math.min(matchdayLimit(state),available-11));}
export function matchdaySelectionReady(state:SeasonState){const club=getSelectedClub(state),available=new Set(availablePlayers(club).map(player=>player.id)),lineup=new Set(state.lineupIds??[]),bench=new Set(state.benchIds??[]);return lineup.size===11&&bench.size===requiredBenchCount(state)&&[...lineup].every(id=>available.has(id))&&[...bench].every(id=>available.has(id)&&!lineup.has(id));}
function normalizeMatchdaySelection(state:SeasonState,club:LeagueClub){const limit=professionalCompetitionById(state.competitionId??state.league.competitionId??"BRA1").benchSize,available=availablePlayers(club).sort((a,b)=>b.overall-a.overall),availableIds=new Set(available.map(player=>player.id)),lineup=(state.lineupIds??[]).filter((id,index,list)=>list.indexOf(id)===index&&availableIds.has(id)).slice(0,11);for(const player of available){if(lineup.length>=11)break;if(!lineup.includes(player.id))lineup.push(player.id);}const starters=new Set(lineup),bench=(state.benchIds??[]).filter((id,index,list)=>list.indexOf(id)===index&&availableIds.has(id)&&!starters.has(id)).slice(0,limit);for(const player of available){if(bench.length>=Math.min(limit,Math.max(0,available.length-11)))break;if(!starters.has(player.id)&&!bench.includes(player.id))bench.push(player.id);}club.players.forEach(player=>refreshStatus(player,lineup.includes(player.id),bench.includes(player.id)));return{lineupIds:lineup,benchIds:bench};}

export function createSeason(baseSeed:string,year=2026,selectedClubId="club-1",competitionId:ProfessionalCompetitionId="BRA1"):SeasonState{
  const league=createLeague(`${baseSeed}:${year}:${competitionId}`,year,competitionId),competition=professionalCompetitionById(competitionId),club=league.clubs.find(c=>c.id===selectedClubId)??league.clubs[0],lineupIds=defaultLineup(club),benchIds=defaultBench(club,lineupIds,competition.benchSize);
  club.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id),benchIds.includes(player.id)));
  const firstDate=league.fixtures.find(f=>f.round===1)?.date??competitionStartDate(competitionId,year);
  return{baseSeed,year,league,currentRound:1,selectedClubId:club.id,lineupIds,benchIds,recentForm:[],completed:false,livingWorld:createLivingWorld(club.name,competitionId),mediaWorld:createMediaWorld(competitionId),market:createMarketState(),career:createManagerCareer(club,year),clubManagement:createClubManagementState(league,baseSeed,year),clubAi:createClubAiState(league,baseSeed),worldCompetitions:createWorldCompetitions(competitionId,league,year,baseSeed),internationalMarket:createInternationalMarket(),competitionId,currentDate:addIsoDays(firstDate,-7)};
}

export function getSelectedClub(state:SeasonState):LeagueClub{return state.league.clubs.find(c=>c.id===state.selectedClubId)??state.league.clubs[0];}
export function getCurrentUserFixture(state:SeasonState):LeagueFixture|undefined{if(state.career?.status==="Sem clube")return undefined;return state.league.fixtures.find(f=>f.round===state.currentRound&&(f.homeClubId===state.selectedClubId||f.awayClubId===state.selectedClubId));}
export function getUserFixtures(state:SeasonState):LeagueFixture[]{return state.league.fixtures.filter(f=>f.homeClubId===state.selectedClubId||f.awayClubId===state.selectedClubId).sort((a,b)=>a.round-b.round);}

function updateStanding(league:LeagueWorld,fixture:LeagueFixture,result:MatchResult){const home=league.standings.find(s=>s.clubId===fixture.homeClubId)!,away=league.standings.find(s=>s.clubId===fixture.awayClubId)!;home.played++;away.played++;home.goalsFor+=result.homeGoals;home.goalsAgainst+=result.awayGoals;away.goalsFor+=result.awayGoals;away.goalsAgainst+=result.homeGoals;if(result.homeGoals>result.awayGoals){home.won++;away.lost++;home.points+=3;}else if(result.homeGoals<result.awayGoals){away.won++;home.lost++;away.points+=3;}else{home.drawn++;away.drawn++;home.points++;away.points++;}}
function resultMoodDelta(goalsFor:number,goalsAgainst:number){return goalsFor>goalsAgainst?3:goalsFor<goalsAgainst?-2:1;}
function disciplinaryThreshold(id:ProfessionalCompetitionId){return id==="ENG1"||id==="ESP1"||id==="FRA1"?5:3;}
function applyPlayerEffects(club:LeagueClub,result:MatchResult,side:"home"|"away",participatingIds:string[],seed:string,competitionId:ProfessionalCompetitionId){
  const rng=new SeededRng(seed),participantIds=new Set(participatingIds),goalsFor=side==="home"?result.homeGoals:result.awayGoals,goalsAgainst=side==="home"?result.awayGoals:result.homeGoals,moraleDelta=resultMoodDelta(goalsFor,goalsAgainst);
  for(const player of club.players){if(player.suspensionMatches>0&&!participantIds.has(player.id))player.suspensionMatches=Math.max(0,player.suspensionMatches-1);if(participantIds.has(player.id)){const liveCondition=result.playerConditionAfter?.[player.id],liveFatigue=result.playerFatigueAfter?.[player.id];player.condition=liveCondition!==undefined?Math.max(35,Math.round(liveCondition)):Math.max(45,player.condition-rng.integer(6,14));player.fatigue=liveFatigue!==undefined?Math.min(100,Math.round(liveFatigue)):Math.min(100,player.fatigue+rng.integer(8,16));player.morale=Math.max(0,Math.min(100,player.morale+moraleDelta+rng.integer(-1,1)));}else{player.condition=Math.min(100,player.condition+1);player.fatigue=Math.max(0,player.fatigue-2);}}
  const threshold=disciplinaryThreshold(competitionId);for(const event of result.events.filter(event=>event.team===side&&event.playerId)){const player=club.players.find(p=>p.id===event.playerId);if(!player)continue;if(event.type==="card"&&player.yellowCards>=threshold){player.yellowCards=0;player.suspensionMatches=Math.max(1,player.suspensionMatches);}if(event.type==="injury")player.injuryDays=Math.max(player.injuryDays,rng.integer(3,14));}
}

export function playCurrentRound(state:SeasonState,userTactic:MatchTactic=DEFAULT_TACTIC,userMatchOverride?:MatchResult,userParticipantIds?:string[]):SeasonState{
  if(state.completed)return state;
  const league=cloneLeague(state.league),managerEmployed=state.career?.status!=="Sem clube",roundFixtures=league.fixtures.filter(f=>f.round===state.currentRound&&!f.played);let lastUserMatch:StoredUserMatch|undefined;
  for(const fixture of roundFixtures){
    const home=league.clubs.find(c=>c.id===fixture.homeClubId)!,away=league.clubs.find(c=>c.id===fixture.awayClubId)!,userHome=managerEmployed&&home.id===state.selectedClubId,userAway=managerEmployed&&away.id===state.selectedClubId,isUserFixture=userHome||userAway,homeStarters=userHome?[...state.lineupIds]:pickStartingXI(home).map(player=>player.id),awayStarters=userAway?[...state.lineupIds]:pickStartingXI(away).map(player=>player.id),homeParticipants=userHome?(userParticipantIds??homeStarters):homeStarters,awayParticipants=userAway?(userParticipantIds??awayStarters):awayStarters;
    const homeAiTactic=tacticForClub(state.clubAi,home.id),awayAiTactic=tacticForClub(state.clubAi,away.id),result=isUserFixture&&userMatchOverride?userMatchOverride:simulateMatch(home,away,`${state.baseSeed}:${state.year}:r${state.currentRound}:${fixture.id}`,userHome?userTactic:homeAiTactic,userAway?userTactic:awayAiTactic,homeStarters,awayStarters);
    fixture.played=true;fixture.homeGoals=result.homeGoals;fixture.awayGoals=result.awayGoals;fixture.homeShots=result.shotsHome;fixture.awayShots=result.shotsAway;fixture.possessionHome=result.possessionHome;fixture.homeYellowCards=result.events.filter(event=>event.team==="home"&&event.type==="card").length;fixture.awayYellowCards=result.events.filter(event=>event.team==="away"&&event.type==="card").length;
    updateStanding(league,fixture,result);
    applySportingStatsAndDevelopment(home,result,"home",homeParticipants,homeStarters,state.currentRound,state.year,`${state.baseSeed}:${fixture.id}:home`);applySportingStatsAndDevelopment(away,result,"away",awayParticipants,awayStarters,state.currentRound,state.year,`${state.baseSeed}:${fixture.id}:away`);
    applyPlayerEffects(home,result,"home",homeParticipants,`${fixture.id}:home`,state.competitionId);applyPlayerEffects(away,result,"away",awayParticipants,`${fixture.id}:away`,state.competitionId);
    if(isUserFixture){const userClub=userHome?home:away,userParticipants=userHome?homeParticipants:awayParticipants;applyPeopleAfterMatch(userClub,userParticipants,state.lineupIds,state.currentRound);lastUserMatch={fixtureId:fixture.id,homeClubId:home.id,awayClubId:away.id,result};}
  }
  const userResult=lastUserMatch?.result,userHome=lastUserMatch?.homeClubId===state.selectedClubId,gf=userResult?(userHome?userResult.homeGoals:userResult.awayGoals):0,ga=userResult?(userHome?userResult.awayGoals:userResult.homeGoals):0,recentForm=[...(state.recentForm??[])];if(userResult)recentForm.push(gf>ga?"V":gf<ga?"D":"E");while(recentForm.length>5)recentForm.shift();
  const totalRounds=league.totalRounds??Math.max(...league.fixtures.map(f=>f.round),TOTAL_ROUNDS),completed=state.currentRound>=totalRounds,championClubId=completed?sortedStandings(league)[0]?.clubId:undefined,nextRound=completed?totalRounds+1:state.currentRound+1,selectedClub=league.clubs.find(c=>c.id===state.selectedClubId)!;
  const selection=normalizeMatchdaySelection({...state,league} as SeasonState,selectedClub),livingWorldBase=state.livingWorld??createLivingWorld(selectedClub.name,state.competitionId);let livingWorld=userResult?worldAfterMatch(livingWorldBase,selectedClub,state.currentRound,gf,ga,state.competitionId):livingWorldBase;const careerResult=careerAfterRound(state.career??createManagerCareer(selectedClub,state.year),league,livingWorld,state.currentRound,state.year,state.baseSeed,userResult?{goalsFor:gf,goalsAgainst:ga}:undefined);livingWorld=careerResult.world;const mediaWorld=userResult?mediaAfterMatch(state.mediaWorld,state.competitionId,selectedClub,state.currentRound,gf,ga,state.baseSeed):hydrateMediaWorld(state.mediaWorld,state.competitionId);
  const clubAi=processClubAiRound(hydrateClubAi(state.clubAi,league,state.baseSeed),league,state.currentRound,state.baseSeed),worldCompetitions=processWorldCompetitions(hydrateWorldCompetitions(state.worldCompetitions,state.competitionId,league,state.year,state.baseSeed),state.currentRound,state.baseSeed),internationalMarket=hydrateInternationalMarket(state.internationalMarket);
  const nextState:SeasonState={...state,league,currentRound:nextRound,lineupIds:selection.lineupIds,benchIds:selection.benchIds,recentForm,completed,championClubId,lastUserMatch,livingWorld,mediaWorld,career:careerResult.career,clubAi,worldCompetitions,internationalMarket};return processInternationalMarketRound(processMarketRound(processClubManagementRound(nextState)));
}

export function advanceSeasonDay(state:SeasonState,calendarDay=1):SeasonState{
  const league=cloneLeague(state.league),club=league.clubs.find(c=>c.id===state.selectedClubId)!;for(const currentClub of league.clubs)for(const player of currentClub.players){if(player.injuryDays>0)player.injuryDays--;player.condition=Math.min(100,player.condition+3);player.fatigue=Math.max(0,player.fatigue-4);if(player.injuryDays===0&&player.morale<95)player.morale++;}
  const selection=normalizeMatchdaySelection({...state,league} as SeasonState,club);let livingWorld=state.livingWorld??createLivingWorld(club.name,state.competitionId),mediaWorld=hydrateMediaWorld(state.mediaWorld,state.competitionId);if(state.career?.status!=="Sem clube"){livingWorld=worldAfterDay(livingWorld,club,state.currentRound,state.baseSeed,state.competitionId);livingWorld=applyNarrativeDay(livingWorld,{day:calendarDay,round:state.currentRound,selectedClubId:state.selectedClubId,seed:state.baseSeed,league});mediaWorld=mediaBeforeRound(mediaWorld,state.competitionId,club,state.currentRound,state.baseSeed,livingWorld.mediaPressure);}return processMarketRound({...state,league,lineupIds:selection.lineupIds,benchIds:selection.benchIds,livingWorld,mediaWorld});
}

export type CalendarRoute="matchday"|"inbox"|"club"|"media"|null;
export type CalendarAdvanceResult={state:SeasonState;route:CalendarRoute;reason:string};
export function getTodayUserFixture(state:SeasonState):LeagueFixture|undefined{return getUserFixtures(state).find(f=>!f.played&&f.date===state.currentDate);}
export function advanceCalendarDay(state:SeasonState):CalendarAdvanceResult{const todayMatch=getTodayUserFixture(state);if(todayMatch)return{state,route:"matchday",reason:"Hoje é dia de jogo. A comissão já encaminhou você para a preparação da partida."};const current=state.currentDate??state.league.fixtures.find(f=>!f.played)?.date??`${state.year}-01-01`,nextDate=addIsoDays(current,1),dayNumber=Math.max(1,Math.floor((new Date(`${nextDate}T12:00:00Z`).getTime()-new Date(`${state.year}-01-01T12:00:00Z`).getTime())/86400000)+1),next=advanceSeasonDay({...state,currentDate:nextDate},dayNumber);if(getTodayUserFixture(next))return{state:next,route:"matchday",reason:"Hoje é dia de jogo. Vá para a preparação da partida."};const pending=next.livingWorld.inbox.find(event=>event.unread&&!event.resolved);if(pending?.kind==="Diretoria")return{state:next,route:"club",reason:`A diretoria precisa de você: ${pending.title}.`};const mediaPending=pendingMediaSessions(next.mediaWorld,next.competitionId)[0];if(mediaPending)return{state:next,route:"media",reason:`A imprensa aguarda você: ${mediaPending.format}.`};if(pending)return{state:next,route:"inbox",reason:`Há uma decisão pendente: ${pending.title}.`};return{state:next,route:null,reason:"Dia avançado. Nenhuma decisão obrigatória surgiu."};}

export function resolveSeasonWorldChoice(state:SeasonState,eventId:string,choiceId:string){const club=getSelectedClub(state),event=state.livingWorld.inbox.find(item=>item.id===eventId),choice=event?.choices.find(item=>item.id===choiceId),resolved=resolveWorldEvent(state.livingWorld,club,eventId,choiceId),league={...state.league,clubs:state.league.clubs.map(current=>current.id===club.id?resolved.club:current)};let next:SeasonState={...state,league,livingWorld:resolved.world};if(!choice?.careerAction)return{state:next,message:resolved.message};const careerResult=applyCareerChoice(state.career??createManagerCareer(club,state.year),league,resolved.world,choice,state.currentRound,state.year,state.baseSeed);next={...next,career:careerResult.career,livingWorld:careerResult.world};if(careerResult.nextClubId){const newClub=league.clubs.find(current=>current.id===careerResult.nextClubId);if(newClub){const lineupIds=defaultLineup(newClub),benchIds=defaultBench(newClub,lineupIds,matchdayLimit(next));newClub.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id),benchIds.includes(player.id)));next={...next,selectedClubId:newClub.id,lineupIds,benchIds,recentForm:[],lastUserMatch:undefined};}}return{state:next,message:careerResult.message};}

export function resolveMediaSessionChoice(state:SeasonState,sessionId:string,choiceId:string){
 const result=answerMediaSession(state.mediaWorld,state.competitionId,sessionId,choiceId),effect=result.effect,clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value))),world={...state.livingWorld};
 world.mediaPressure=clamp(world.mediaPressure+(effect.mediaPressure??0));world.fanSupport=clamp(world.fanSupport+(effect.fanSupport??0));world.managerReputation=clamp(world.managerReputation+(effect.managerReputation??0));world.boardConfidence=clamp(world.boardConfidence+(effect.boardConfidence??0));
 return{state:{...state,livingWorld:world,mediaWorld:result.mediaWorld},message:result.message};
}

export function setMatchdayRole(state:SeasonState,playerId:string,role:MatchdayRole):SeasonState{const club=getSelectedClub(state),player=club.players.find(p=>p.id===playerId);if(!player||player.injuryDays>0||player.suspensionMatches>0)return state;const limit=matchdayLimit(state),lineup=(state.lineupIds??[]).filter(id=>id!==playerId),bench=(state.benchIds??[]).filter(id=>id!==playerId);if(role==="starter"&&lineup.length<11)lineup.push(playerId);if(role==="bench"&&bench.length<limit)bench.push(playerId);const league=cloneLeague(state.league),nextClub=league.clubs.find(c=>c.id===state.selectedClubId)!;nextClub.players.forEach(current=>refreshStatus(current,lineup.includes(current.id),bench.includes(current.id)));return{...state,league,lineupIds:lineup,benchIds:bench};}
export function toggleLineupPlayer(state:SeasonState,playerId:string):SeasonState{return setMatchdayRole(state,playerId,state.lineupIds.includes(playerId)?"out":"starter");}
export function toggleBenchPlayer(state:SeasonState,playerId:string):SeasonState{return setMatchdayRole(state,playerId,(state.benchIds??[]).includes(playerId)?"out":"bench");}

export function startNextSeason(state:SeasonState):SeasonState{
  if(!state.completed)return state;const nextYear=state.year+1,league=cloneLeague(state.league),prepared=prepareNextMarketSeason(state,nextYear,league);preparePlayerDevelopmentNextSeason(prepared.league,nextYear);for(const currentClub of prepared.league.clubs){currentClub.transferBudgetEur+=Math.max(2_000_000,Math.round(currentClub.marketValueEur*.04/100_000)*100_000);currentClub.wageBudgetBrlMonthly=Math.round(currentClub.wageBudgetBrlMonthly*1.05/10_000)*10_000;}
  const competitionId=state.competitionId??state.league.competitionId??"BRA1",competition=professionalCompetitionById(competitionId);prepared.league.fixtures=generateFixtures(prepared.league.clubs.map(c=>c.id),competitionStartDate(competitionId,nextYear),competition.roundCadenceDays,competition.doubleRoundRobin);prepared.league.competitionId=competitionId;prepared.league.competitionName=competition.name;prepared.league.totalRounds=Math.max(...prepared.league.fixtures.map(f=>f.round),0);prepared.league.standings=prepared.league.clubs.map(c=>({clubId:c.id,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0}));
  const club=prepared.league.clubs.find(c=>c.id===state.selectedClubId)??prepared.league.clubs[0],lineupIds=defaultLineup(club),benchIds=defaultBench(club,lineupIds,competition.benchSize);club.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id),benchIds.includes(player.id)));const livingWorld=state.career?.status==="Sem clube"?{...state.livingWorld,lastDailyRound:undefined,lastNarrativeDay:undefined}:createLivingWorld(club.name,competitionId);livingWorld.managerReputation=state.livingWorld?.managerReputation??livingWorld.managerReputation;const clubManagement=prepareNextClubManagementSeason(state,nextYear,prepared.league),clubAi=prepareClubAiNextSeason(hydrateClubAi(state.clubAi,prepared.league,state.baseSeed),prepared.league,state.baseSeed),worldCompetitions=prepareWorldCompetitionsNextSeason(hydrateWorldCompetitions(state.worldCompetitions,competitionId,prepared.league,state.year,state.baseSeed),competitionId,prepared.league,nextYear,state.baseSeed),internationalMarket=prepareInternationalMarketNextSeason(state.internationalMarket),firstDate=prepared.league.fixtures.find(f=>f.round===1)?.date??competitionStartDate(competitionId,nextYear);const previousMedia=hydrateMediaWorld(state.mediaWorld,competitionId),mediaWorld=hydrateMediaWorld({...previousMedia,lastPreMatchRound:undefined,lastPostMatchRound:undefined,lastProgramRound:undefined,sessions:previousMedia.sessions.filter(session=>session.status==="Concluída").slice(0,12),trends:[]},competitionId);return{...state,year:nextYear,league:prepared.league,currentRound:1,lineupIds,benchIds,recentForm:[],completed:false,championClubId:undefined,lastUserMatch:undefined,livingWorld,mediaWorld,market:prepared.market,career:state.career??createManagerCareer(club,nextYear),clubManagement,clubAi,worldCompetitions,internationalMarket,competitionId,currentDate:addIsoDays(firstDate,-7)};
}

function hydratePlayer(player:LeaguePlayer,year:number){player.potential=player.potential??Math.min(95,player.overall+(player.age<=21?7:player.age<=24?4:1));player.seasonStartOverall=player.seasonStartOverall??player.overall;player.developmentProgress=player.developmentProgress??0;player.overallHistory=player.overallHistory?.length?player.overallHistory:[{year,round:0,overall:player.overall,reason:"início"}];player.shots=player.shots??0;player.redCards=player.redCards??0;player.wins=player.wins??0;player.draws=player.draws??0;player.losses=player.losses??0;player.cleanSheets=player.cleanSheets??0;player.ratingTotal=player.ratingTotal??0;player.ratedMatches=player.ratedMatches??0;player.averageRating=player.averageRating??0;player.lastRating=player.lastRating??0;player.goals=player.goals??0;player.assists=player.assists??0;player.appearances=player.appearances??0;player.starts=player.starts??0;player.minutes=player.minutes??0;}
export function saveSeasonLocal(state:SeasonState):void{if(typeof window!=="undefined")window.localStorage.setItem(SEASON_SAVE_KEY,JSON.stringify(state));}
export function hydrateSeasonState(parsed:SeasonState):SeasonState{const competitionId=(parsed.competitionId??parsed.league?.competitionId??"BRA1") as ProfessionalCompetitionId,competition=professionalCompetitionById(competitionId),year=parsed.year??2026;parsed.competitionId=competitionId;parsed.league.competitionId=competitionId;parsed.league.competitionName=competition.name;for(const club of parsed.league.clubs)for(const player of club.players)hydratePlayer(player,year);if(parsed.league.fixtures.some(f=>!f.date)){const dated=generateFixtures(parsed.league.clubs.map(c=>c.id),competitionStartDate(competitionId,year),competition.roundCadenceDays,competition.doubleRoundRobin),dateByRound=new Map(dated.map(f=>[f.round,f.date]));parsed.league.fixtures=parsed.league.fixtures.map(f=>({...f,date:f.date??dateByRound.get(f.round)}));}parsed.league.totalRounds=parsed.league.totalRounds??Math.max(...parsed.league.fixtures.map(f=>f.round),0);if(!parsed.currentDate){const next=parsed.league.fixtures.find(f=>!f.played&&f.round===parsed.currentRound)?.date??parsed.league.fixtures.find(f=>!f.played)?.date??competitionStartDate(competitionId,year);parsed.currentDate=addIsoDays(next,-1);}if(!parsed.career){const club=parsed.league.clubs.find(c=>c.id===parsed.selectedClubId)??parsed.league.clubs[0];parsed.career=createManagerCareer(club,year);}if(!parsed.clubManagement)parsed.clubManagement=hydrateClubManagement(parsed);parsed.mediaWorld=hydrateMediaWorld(parsed.mediaWorld,competitionId);parsed.clubAi=hydrateClubAi(parsed.clubAi,parsed.league,parsed.baseSeed);parsed.worldCompetitions=hydrateWorldCompetitions(parsed.worldCompetitions,competitionId,parsed.league,year,parsed.baseSeed);parsed.internationalMarket=hydrateInternationalMarket(parsed.internationalMarket);const club=getSelectedClub(parsed),selection=normalizeMatchdaySelection(parsed,club);parsed.lineupIds=selection.lineupIds;parsed.benchIds=selection.benchIds;return parsed;}
export function loadSeasonLocal():SeasonState|null{if(typeof window==="undefined")return null;try{const raw=window.localStorage.getItem(SEASON_SAVE_KEY);if(!raw)return null;const parsed=JSON.parse(raw) as SeasonState;if(!parsed?.baseSeed||!parsed.league?.clubs?.length||!Array.isArray(parsed.lineupIds)||!parsed.livingWorld||!parsed.market)return null;return hydrateSeasonState(parsed);}catch{return null;}}
