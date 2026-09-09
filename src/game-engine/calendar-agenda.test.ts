import { describe, expect, it } from "vitest";
import { buildCalendarAgenda, compactAgendaMatches, agendaRemainingFutureMatches, type CalendarAgendaMatch } from "./calendar-agenda";
import { createSeason } from "./season";

function match(id:string,date:string):CalendarAgendaMatch{return{id,date,competition:"Teste",stage:"Rodada",kind:"Liga",homeName:"Casa",awayName:"Fora",played:false,status:"Agendado"};}

describe("calendar agenda",()=>{
 it("keeps the first view compact and reveals recent games only when requested",()=>{
  const matches=[match("old-1","2026-03-29"),match("old-2","2026-03-30"),match("old-3","2026-03-31"),...Array.from({length:25},(_,index)=>match(`future-${index}`,`2026-04-${String(index+1).padStart(2,"0")}`))];
  const compact=compactAgendaMatches(matches,"2026-04-01",6,0);
  expect(compact).toHaveLength(6);
  expect(compact.every(item=>item.date>="2026-04-01")).toBe(true);
  expect(agendaRemainingFutureMatches(matches,"2026-04-01",6)).toBe(19);
  const withRecent=compactAgendaMatches(matches,"2026-04-01",6,2);
  expect(withRecent).toHaveLength(8);
  expect(withRecent.slice(0,2).map(item=>item.id)).toEqual(["old-2","old-3"]);
 });

 it("builds one agenda with league, cups and national-team fixtures",()=>{
  const season=createSeason("calendar-agenda-test",2026,"club-1","BRA1"),agenda=buildCalendarAgenda(season);
  expect(agenda.allGames.some(item=>item.kind==="Liga")).toBe(true);
  expect(agenda.allGames.some(item=>item.kind==="Copa")).toBe(true);
  expect(agenda.allGames.some(item=>item.kind==="Seleção")).toBe(true);
  expect(agenda.myGames.some(item=>item.isUserClub)).toBe(true);
  expect(agenda.allGames.length).toBeGreaterThan(agenda.myGames.length);
 });
});
