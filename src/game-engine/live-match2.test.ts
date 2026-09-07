import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{advanceLiveMatchMinute,createLiveMatch,liveMatchResult,startLiveMatch}from"./live-match";

describe("match engine 3.0",()=>{
 it("produz xG, ações defensivas, desgaste, momentum e zonas",()=>{
  const league=createLeague("live2",2026,"BRA1"),home=league.clubs[0],away=league.clubs[1],xi=home.players.slice(0,11).map(p=>p.id);
  let state=startLiveMatch(createLiveMatch(home,away,"live2","home",xi),home);
  for(let minute=0;minute<20;minute++){const next=advanceLiveMatchMinute(state,home,away);if(next.currentMinute===state.currentMinute)break;state=next;}
  const result=liveMatchResult(state);
  expect(result.xgHome).toBeGreaterThanOrEqual(0);
  expect(result.passesHome).toBeGreaterThan(0);
  expect(result.playerMinutes?.[xi[0]]).toBeGreaterThan(0);
  expect(result.playerConditionAfter?.[xi[0]]).toBeLessThan(100);
  expect(state.momentumHistory?.length).toBeGreaterThan(1);
  expect((state.homeAttackZones?.left??0)+(state.homeAttackZones?.center??0)+(state.homeAttackZones?.right??0)).toBeGreaterThan(0);
 });
});
