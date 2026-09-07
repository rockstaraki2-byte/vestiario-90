import { describe, expect, it } from "vitest";
import { NATIONAL_COMPETITIONS_2026, NATIONS_LEAGUE_2026_27_GROUPS, WORLD_CUP_2026_GROUPS } from "../data/national-teams-2026";
import { realManagerForClub } from "../data/real-managers-2026";
import { WORLD_COMPETITIONS, worldCompetitionCalendar } from "./world-competitions";

describe("real-world competition formats",()=>{
 it("models the 2026 Copa do Brasil structure",()=>{
  const cup=WORLD_COMPETITIONS.find(c=>c.id==="CDB")!;
  expect(cup.participants).toBe(126);
  expect(cup.stages).toHaveLength(9);
  expect(cup.stages[0].legs).toBe(1);
  expect(cup.stages[1].legs).toBe(2);
  expect(cup.stages[4].name).toBe("5ª fase");
  expect(cup.stages[4].legs).toBe(2);
  expect(cup.stages.at(-1)?.dates).toEqual(["2026-12-06"]);
  expect(cup.stages.at(-1)?.legs).toBe(1);
 });
 it("models UEFA league phases with the correct size and match count",()=>{
  expect(WORLD_COMPETITIONS.find(c=>c.id==="UCL")).toMatchObject({participants:36,leaguePhaseMatches:8,format:"Liga + mata-mata"});
  expect(WORLD_COMPETITIONS.find(c=>c.id==="UEL")).toMatchObject({participants:36,leaguePhaseMatches:8});
  expect(WORLD_COMPETITIONS.find(c=>c.id==="UECL")).toMatchObject({participants:36,leaguePhaseMatches:6});
 });
 it("keeps CONMEBOL group format and two-leg knockouts",()=>{
  const lib=WORLD_COMPETITIONS.find(c=>c.id==="LIB")!,sud=WORLD_COMPETITIONS.find(c=>c.id==="SUD")!;
  expect(lib).toMatchObject({participants:32,groupCount:8,groupSize:4});
  expect(lib.stages[1].legs).toBe(2);
  expect(sud.stages[1].name).toBe("Play-off");
  expect(sud.stages[1].legs).toBe(2);
 });
 it("adds the Carabao Cup with two-legged semifinals",()=>{
  const cup=WORLD_COMPETITIONS.find(c=>c.id==="EFL")!;
  expect(cup.participants).toBe(92);
  expect(cup.stages.find(s=>s.name==="Semifinal")?.legs).toBe(2);
 });
 it("projects the real season calendar into future saves",()=>{
  const uclFinal=worldCompetitionCalendar(2028).find(e=>e.competitionId==="UCL"&&e.stage==="Final");
  expect(uclFinal?.date).toBe("2029-06-05");
 });
});

describe("national-team world",()=>{
 it("has the 48-team World Cup with 12 groups of four",()=>{
  expect(Object.keys(WORLD_CUP_2026_GROUPS)).toHaveLength(12);
  expect(Object.values(WORLD_CUP_2026_GROUPS).every(group=>group.length===4)).toBe(true);
  expect(new Set(Object.values(WORLD_CUP_2026_GROUPS).flat()).size).toBe(48);
  expect(NATIONAL_COMPETITIONS_2026.find(c=>c.id==="WC2026")?.participants).toBe(48);
 });
 it("has Nations League A-D groups",()=>{
  expect(Object.keys(NATIONS_LEAGUE_2026_27_GROUPS.A)).toHaveLength(4);
  expect(Object.keys(NATIONS_LEAGUE_2026_27_GROUPS.D)).toHaveLength(2);
  expect(NATIONAL_COMPETITIONS_2026.find(c=>c.id==="UNL2627")?.stages).toHaveLength(9);
 });
});

describe("real manager database",()=>{
 it("resolves club-name aliases",()=>{
  expect(realManagerForClub("FC Arsenal")?.manager).toBe("Mikel Arteta");
  expect(realManagerForClub("Manchester City FC")?.manager).toBe("Enzo Maresca");
  expect(realManagerForClub("Palmeiras")?.manager).toBe("Abel Ferreira");
  expect(realManagerForClub("Paris Saint-Germain")?.manager).toBe("Luis Enrique");
 });
});
