import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{createStateWorldTournaments}from"./state-world-competitions";

describe("Brazilian state championships",()=>{
 it("creates playable calendars only from verified state data",()=>{const league=createLeague("states",2026,"BRA1"),tournaments=createStateWorldTournaments(league,2026);expect(tournaments.length).toBeGreaterThanOrEqual(10);expect(tournaments.every(t=>t.definition.kind==="Estadual"&&t.matches.length>0)).toBe(true);expect(tournaments.every(t=>t.matches.every(m=>/^2026-/.test(m.date)))).toBe(true)});
});
