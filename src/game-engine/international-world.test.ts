import { describe, expect, it } from "vitest";
import { internationalWorldFixtures, worldCupSnapshot } from "./international-world";

describe("international world for existing saves",()=>{
 it("reconstructs World Cup group results and standings from the save date",()=>{
  const snapshot=worldCupSnapshot(2026,"old-save", "2026-06-25");
  expect(snapshot.groupMatches.every(match=>match.played)).toBe(true);
  expect(Object.keys(snapshot.groupTables)).toHaveLength(12);
  expect(snapshot.groupTables.C.reduce((sum,row)=>sum+row.played,0)).toBe(12);
  expect(snapshot.groupTables.C.reduce((sum,row)=>sum+row.points,0)).toBeGreaterThan(0);
  expect(snapshot.knockoutMatches.length).toBeGreaterThan(0);
 });

 it("builds the complete knockout and champion after the final date",()=>{
  const snapshot=worldCupSnapshot(2026,"old-save", "2026-07-20");
  expect(snapshot.knockoutMatches).toHaveLength(32);
  expect(snapshot.knockoutMatches.every(match=>match.played)).toBe(true);
  expect(snapshot.championName).toBeTruthy();
 });

 it("adds World Cup knockout games to the global international calendar",()=>{
  const fixtures=internationalWorldFixtures(2026,"old-save","2026-07-10");
  expect(fixtures.some(match=>match.competition==="Copa do Mundo"&&match.stage==="Quartas de final")).toBe(true);
  expect(fixtures.some(match=>match.competition==="Nations League")).toBe(true);
 });
});
