import { describe, expect, it } from "vitest";
import { createSeason } from "./season";
import { liveCompetitionLabel, liveCompetitionScope, playerCompetitionGoalsAtMoment } from "./match-presentation";
import type { MatchEvent } from "./match";

describe("goal presentation",()=>{
 it("uses the competition encoded in the live-match seed",()=>{
  expect(liveCompetitionScope("career:2026:LIB:match-1:live")).toBe("LIB");
  expect(liveCompetitionLabel("career:2026:LIB:match-1:live")).toBe("Libertadores");
  expect(liveCompetitionScope("career:2026:r12:match-1:live")).toBe("LEAGUE");
 });

 it("adds goals scored in the live match to the previous competition total",()=>{
  const season=createSeason("goal-card-test",2026,"club-1","BRA1"),player=season.league.clubs[0].players[0];
  player.competitionStats={LIB:{appearances:3,starts:3,minutes:270,goals:2,assists:0,shots:4,yellowCards:0,wins:2,draws:1,losses:0,cleanSheets:0,ratingTotal:21,ratedMatches:3,averageRating:7,lastRating:7}};
  const events:MatchEvent[]=[{minute:12,type:"goal",team:"home",playerId:player.id,text:"Gol"},{minute:68,type:"goal",team:"home",playerId:player.id,text:"Gol"}];
  expect(playerCompetitionGoalsAtMoment(player,events,"career:2026:LIB:quartas:live")).toBe(4);
 });
});
