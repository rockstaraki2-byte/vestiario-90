import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{closeSeasonIfReady}from"./season-lifecycle";

describe("legacy season closure repair",()=>{
 it("reopens an old save that was marked complete while a cup match is still pending",()=>{const state=createSeason("legacy-premature-close",2026),cup=state.worldCompetitions.tournaments.flatMap(t=>t.matches).find(m=>m.home.activeClubId===state.selectedClubId||m.away.activeClubId===state.selectedClubId);expect(cup).toBeTruthy();state.completed=true;const repaired=closeSeasonIfReady(state);expect(repaired.completed).toBe(false)});
});
