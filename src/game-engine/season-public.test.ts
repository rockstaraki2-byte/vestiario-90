import { describe, expect, it } from "vitest";
import { DEFAULT_TACTIC, type MatchResult } from "./match";
import { createSeason, getCurrentUserFixture } from "./season";
import { playCurrentRound } from "./season-public";

describe("guarded live post-match progression",()=>{
  it("não reaplica o mesmo resultado na rodada seguinte",()=>{
    const initial=createSeason("postmatch-guard",2026);
    const fixture=getCurrentUserFixture(initial)!;
    initial.currentDate=fixture.date!;
    const result:MatchResult={homeGoals:2,awayGoals:1,possessionHome:54,shotsHome:11,shotsAway:8,events:[{minute:90,type:"fulltime",team:"neutral",text:"fim"}]};
    const after=playCurrentRound(initial,DEFAULT_TACTIC,result,initial.lineupIds);
    expect(after.currentRound).toBe(2);
    const repeated=playCurrentRound(after,DEFAULT_TACTIC,result,after.lineupIds);
    expect(repeated.currentRound).toBe(2);
    expect(repeated.league.standings).toEqual(after.league.standings);
    expect(repeated.lastUserMatch?.fixtureId).toBe(after.lastUserMatch?.fixtureId);
  });
});
