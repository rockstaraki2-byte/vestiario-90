import { describe, expect, it } from "vitest";
import { coordinateSeasonCalendars } from "./calendar-coordinator";
import { createSeason } from "./season";

const DAY=86_400_000;
function distance(a:string,b:string){return Math.abs(new Date(`${a}T12:00:00Z`).getTime()-new Date(`${b}T12:00:00Z`).getTime())/DAY;}

describe("calendar coordinator regressions",()=>{
 it("repairs a legacy save that piled several user league matches onto the same date",()=>{
  const state=createSeason("calendar-pileup-regression",2026,"club-1","BRA1");
  const clubId=state.selectedClubId;
  state.currentDate="2026-08-08";
  state.currentRound=23;
  for(const fixture of state.league.fixtures){if(fixture.round<=20)fixture.played=true;}
  const userFixtures=state.league.fixtures.filter(f=>f.homeClubId===clubId||f.awayClubId===clubId);
  const byRound=(round:number)=>userFixtures.find(f=>f.round===round)!;
  byRound(20).date="2026-08-08";
  byRound(21).played=false;byRound(21).date="2026-08-14";
  byRound(22).played=false;byRound(22).date="2026-08-14";
  byRound(23).played=false;byRound(23).date="2026-08-08";
  byRound(25).played=false;byRound(25).date="2026-08-14";

  const repaired=coordinateSeasonCalendars(state);
  const pending=repaired.league.fixtures
   .filter(f=>!f.played&&(f.homeClubId===clubId||f.awayClubId===clubId))
   .sort((a,b)=>a.round-b.round);

  expect(repaired.currentRound).toBe(21);
  expect(pending[0].round).toBe(21);
  expect(pending.every(f=>Boolean(f.date)&&f.date!>=state.currentDate)).toBe(true);
  expect(new Set(pending.map(f=>f.date)).size).toBe(pending.length);
  expect(distance("2026-08-08",pending[0].date!)).toBeGreaterThanOrEqual(3);
  for(let index=1;index<pending.length;index++){
   expect(pending[index].date!>pending[index-1].date!).toBe(true);
   expect(distance(pending[index-1].date!,pending[index].date!)).toBeGreaterThanOrEqual(3);
  }
 });

 it("is stable after repairing the schedule instead of moving matches again on every hydration",()=>{
  const state=createSeason("calendar-idempotence-regression",2026,"club-1","BRA1");
  const clubId=state.selectedClubId;
  state.currentDate="2026-08-08";
  for(const fixture of state.league.fixtures){if(fixture.round<=20)fixture.played=true;}
  const pending=state.league.fixtures.filter(f=>!f.played&&(f.homeClubId===clubId||f.awayClubId===clubId)).sort((a,b)=>a.round-b.round);
  pending[0].date="2026-08-14";
  pending[1].date="2026-08-14";
  pending[2].date="2026-08-08";

  const once=coordinateSeasonCalendars(state);
  const twice=coordinateSeasonCalendars(once);
  const dates=(value:typeof once)=>value.league.fixtures.filter(f=>!f.played&&(f.homeClubId===clubId||f.awayClubId===clubId)).sort((a,b)=>a.round-b.round).map(f=>f.date);

  expect(dates(twice)).toEqual(dates(once));
 });
});
