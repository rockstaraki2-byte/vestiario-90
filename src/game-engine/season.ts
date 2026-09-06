import { SeededRng } from "./rng";
import { createLeague, sortedStandings, type LeagueClub, type LeagueFixture, type LeaguePlayer, type LeagueWorld } from "./league";
import { DEFAULT_TACTIC, pickStartingXI, simulateMatch, type MatchResult, type MatchTactic } from "./match";
import { applyPeopleAfterMatch } from "./people";
import { createLivingWorld, worldAfterDay, worldAfterMatch, type LivingWorldState } from "./world-events";

export const SEASON_SAVE_KEY="vestiario90:season:v4";
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
  championClubId?:string;
  lastUserMatch?:StoredUserMatch;
};

function cloneLeague(league:LeagueWorld):LeagueWorld{
  return{
    clubs:league.clubs.map(club=>({...club,players:club.players.map(player=>({...player,promises:(player.promises??[]).map(promise=>({...promise}))}))})),
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

export function createSeason(baseSeed:string,year=2026,selectedClubId="club-1"):SeasonState{
  const league=createLeague(`${baseSeed}:${year}`);
  const club=league.clubs.find(c=>c.id===selectedClubId)??league.clubs[0];
  const lineupIds=defaultLineup(club);
  club.players.forEach(player=>refreshStatus(player,lineupIds.includes(player.id)));
  return{baseSeed,year,league,currentRound:1,selectedClubId:club.id,lineupIds,recentForm:[],completed:false,livingWorld:createLivingWorld(club.name)};
}

export function getSelectedClub(state:SeasonState):LeagueClub{return state.league.clubs.find(c=>c.id===state.selectedClubId)??state.league.clubs[0];}

export function getCurrentUserFixture(state:SeasonState):LeagueFixture|undefined{
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
  const roundFixtures=league.fixtures.filter(f=>f.round===state.currentRound&&!f.played);
  let lastUserMatch:StoredUserMatch|undefined;
  for(const fixture of roundFixtures){
    const home=league.clubs.find(c=>c.id===fixture.homeClubId)!;
    const away=league.clubs.find(c=>c.id===fixture.awayClubId)!;
    const userHome=home.id===state.selectedClubId,userAway=away.id===state.selectedClubId;
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
  const completed=state.currentRound>=TOTAL_ROUNDS;
  const championClubId=completed?sortedStandings(league)[0]?.clubId:undefined;
  const nextRound=completed?TOTAL_ROUNDS+1:state.currentRound+1;
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
  const livingWorld=userResult?worldAfterMatch(state.livingWorld??createLivingWorld(selectedClub.name),selectedClub,state.currentRound,gf,ga):(state.livingWorld??createLivingWorld(selectedClub.name));
  return{...state,league,currentRound:nextRound,lineupIds,recentForm,completed,championClubId,lastUserMatch,livingWorld};
}

export function advanceSeasonDay(state:SeasonState):SeasonState{
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
  const livingWorld=worldAfterDay(state.livingWorld??createLivingWorld(club.name),club,state.currentRound,state.baseSeed);
  return{...state,league,livingWorld};
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
  const next=createSeason(state.baseSeed,state.year+1,state.selectedClubId);
  next.livingWorld.managerReputation=state.livingWorld?.managerReputation??next.livingWorld.managerReputation;
  return next;
}

export function saveSeasonLocal(state:SeasonState):void{if(typeof window!=="undefined")window.localStorage.setItem(SEASON_SAVE_KEY,JSON.stringify(state));}

export function loadSeasonLocal():SeasonState|null{
  if(typeof window==="undefined")return null;
  try{
    const raw=window.localStorage.getItem(SEASON_SAVE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw) as SeasonState;
    if(!parsed?.baseSeed||!parsed.league?.clubs?.length||!Array.isArray(parsed.lineupIds)||!parsed.livingWorld)return null;
    return parsed;
  }catch{return null;}
}
