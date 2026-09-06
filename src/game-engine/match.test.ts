import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{simulateMatch}from"./match";

describe("match engine",()=>{
 const league=createLeague("partida");
 it("é determinística para a mesma seed e tática",()=>expect(simulateMatch(league.clubs[0],league.clubs[1],"rodada-1")).toEqual(simulateMatch(league.clubs[0],league.clubs[1],"rodada-1")));
 it("gera placar, estatísticas e apito final",()=>{const result=simulateMatch(league.clubs[0],league.clubs[1],"rodada-2");expect(result.homeGoals).toBeGreaterThanOrEqual(0);expect(result.possessionHome).toBeGreaterThanOrEqual(38);expect(result.events.at(-1)?.type).toBe("fulltime")});
});
