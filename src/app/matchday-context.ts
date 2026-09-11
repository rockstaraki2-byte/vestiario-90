import { pickAiStartingXI, tacticForClub } from "@/game-engine/club-ai";
import { simulateMatch, type MatchEvent, type MatchResult } from "@/game-engine/match";
import type { SeasonState } from "@/game-engine/season";

export type MatchdayParallelMatch={
  id:string;
  round:number;
  homeId:string;
  awayId:string;
  homeName:string;
  awayName:string;
  homeShort:string;
  awayShort:string;
  homeImageUrl?:string;
  awayImageUrl?:string;
  result:MatchResult;
};

export type CompactMatchdayNews={id:string;source:string;headline:string;summary?:string;round:number};

export function buildParallelRoundMatches(state:SeasonState,userFixtureId?:string):MatchdayParallelMatch[]{
  const target=state.league.fixtures.find(f=>f.id===userFixtureId);
  const round=target?.round??state.currentRound;
  return state.league.fixtures
    .filter(f=>f.round===round&&f.id!==userFixtureId)
    .map(fixture=>{
      const home=state.league.clubs.find(c=>c.id===fixture.homeClubId)!;
      const away=state.league.clubs.find(c=>c.id===fixture.awayClubId)!;
      const homeStarters=pickAiStartingXI(home,state.clubAi).map(player=>player.id);
      const awayStarters=pickAiStartingXI(away,state.clubAi).map(player=>player.id);
      const result=simulateMatch(
        home,
        away,
        `${state.baseSeed}:${state.year}:r${round}:${fixture.id}`,
        tacticForClub(state.clubAi,home.id),
        tacticForClub(state.clubAi,away.id),
        homeStarters,
        awayStarters,
      );
      return{id:fixture.id,round,homeId:home.id,awayId:away.id,homeName:home.name,awayName:away.name,homeShort:home.shortName,awayShort:away.shortName,homeImageUrl:home.imageUrl,awayImageUrl:away.imageUrl,result};
    });
}

export function scoreAtMinute(result:MatchResult,minute:number){
  let home=0,away=0;
  for(const event of result.events){
    if(event.minute>minute||event.type!=="goal")continue;
    if(event.team==="home")home++;
    if(event.team==="away")away++;
  }
  return{home,away};
}

export function goalEventsUntil(result:MatchResult,minute:number):MatchEvent[]{
  return result.events.filter(event=>event.type==="goal"&&event.minute<=minute);
}
