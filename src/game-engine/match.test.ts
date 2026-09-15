import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{simulateMatch}from"./match";

describe("match engine",()=>{
 const league=createLeague("partida");
 it("é determinística para a mesma seed, tática e estado inicial",()=>{const run=()=>simulateMatch(structuredClone(league.clubs[0]),structuredClone(league.clubs[1]),"rodada-1");expect(run()).toEqual(run())});
 it("gera placar, estatísticas e apito final",()=>{const result=simulateMatch(structuredClone(league.clubs[0]),structuredClone(league.clubs[1]),"rodada-2");expect(result.homeGoals).toBeGreaterThanOrEqual(0);expect(result.possessionHome).toBeGreaterThanOrEqual(38);expect(result.events.at(-1)?.type).toBe("fulltime")});
});
