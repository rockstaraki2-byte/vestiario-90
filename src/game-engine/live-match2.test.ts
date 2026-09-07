import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{advanceLiveMatchMinute,createLiveMatch,liveMatchResult,resumeSecondHalf,startLiveMatch}from"./live-match";

describe("match engine 3.0",()=>{
 it("produz xG, ações defensivas, desgaste, momentum e zonas",()=>{
  const league=createLeague("live2",2026,"BRA1"),home=league.clubs[0],away=league.clubs[1],xi=home.players.slice(0,11).map(p=>p.id);
  let state=startLiveMatch(createLiveMatch(home,away,"live2","home",xi),home);
  while(state.phase==="first_half")state=advanceLiveMatchMinute(state,home,away);
  state=resumeSecondHalf(state);
  while(state.phase==="second_half_window")state=advanceLiveMatchMinute(state,home,away);
  const result=liveMatchResult(state);
  expect(result.xgHome).toBeGreaterThanOrEqual(0);
  expect(result.passesHome).toBeGreaterThan(0);
  expect(result.playerMinutes?.[xi[0]]).toBeGreaterThan(0);
  expect(result.playerConditionAfter?.[xi[0]]).toBeLessThan(100);
  expect(state.momentumHistory?.length).toBeGreaterThan(1);
  expect((state.homeAttackZones?.left??0)+(state.homeAttackZones?.center??0)+(state.homeAttackZones?.right??0)).toBeGreaterThan(0);
 });
});
