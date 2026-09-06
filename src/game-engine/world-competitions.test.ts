import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{createWorldCompetitions,processWorldCompetitions,userWorldCompetitionMatches}from"./world-competitions";

describe("world competitions",()=>{
 it("cria copas domésticas e continentais para o país ativo",()=>{const league=createLeague("cups",2026,"BRA1"),world=createWorldCompetitions("BRA1",league,2026,"cups");expect(world.tournaments.some(t=>t.definition.id==="CDB")).toBe(true);expect(world.tournaments.some(t=>t.definition.id==="LIB")).toBe(true);expect(world.tournaments.some(t=>t.definition.id==="SUD")).toBe(true)});
 it("avança mata-matas e registra campeões",()=>{const league=createLeague("cups-progress",2026,"ENG1"),initial=createWorldCompetitions("ENG1",league,2026,"cups-progress");let world=initial;for(let round=1;round<=30;round++)world=processWorldCompetitions(world,round,"cups-progress");expect(world.history.length).toBeGreaterThan(0);expect(world.tournaments.some(t=>t.completed)).toBe(true)});
 it("identifica partidas paralelas do clube ativo",()=>{const league=createLeague("cups-user",2026,"ESP1"),world=createWorldCompetitions("ESP1",league,2026,"cups-user"),club=league.clubs[0];expect(userWorldCompetitionMatches(world,club.id).length).toBeGreaterThan(0)});
});
