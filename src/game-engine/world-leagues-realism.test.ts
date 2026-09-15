import{describe,expect,it}from"vitest";
import{createWorldLeagues,processWorldLeaguesThroughDate}from"./world-leagues";

describe("Sprint 13 — mundo vivo paralelo",()=>{
  it("processa calendários carregados até a data e persiste desgaste, lesões e auditoria",()=>{const initial=createWorldLeagues("s13-world",2026,"BRA1"),eng=initial.leagues.ENG1!;initial.loadedCompetitionIds=["BRA1","ENG1"];const lastDate=eng.fixtures.map(f=>f.date).filter(Boolean).sort().at(-1)!;const processed=processWorldLeaguesThroughDate(initial,"s13-world",lastDate),league=processed.leagues.ENG1!,played=league.fixtures.filter(f=>f.played);expect(played.length).toBe(league.fixtures.length);expect(league.standings.every(row=>row.played>0)).toBe(true);expect(league.players.some(player=>player.appearances>0)).toBe(true);expect(league.players.some(player=>player.fatigue>0||player.injuryDays>0)).toBe(true);expect(league.realismAudit?.matches).toBe(played.length);expect((league.injuryLog?.length??0)).toBeGreaterThan(0);expect(league.realismAudit!.goalsPerMatch).toBeGreaterThan(1.8);expect(league.realismAudit!.goalsPerMatch).toBeLessThan(3.6);});
});
