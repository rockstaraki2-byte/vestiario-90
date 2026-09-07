import { describe, expect, it } from "vitest";
import { createLeague } from "./league";
import { academySquads, clubStaff, humanMarketProfile, managerWorld, medicalDepth, scoutingReport } from "./depth-systems";

describe("depth systems",()=>{
 it("generates deterministic individual staff and academy squads",()=>{
  const league=createLeague("depth-test",2026,"BRA1"),club=league.clubs[0];
  expect(clubStaff(club)).toEqual(clubStaff(club));
  expect(clubStaff(club).some(s=>s.role==="Olheiro"&&s.judging>0)).toBe(true);
  expect(academySquads(club,2026).some(p=>p.squad==="Sub-17")).toBe(true);
  expect(academySquads(club,2026).some(p=>p.squad==="Sub-20")).toBe(true);
 });
 it("scouting hides precision at lower knowledge",()=>{
  const league=createLeague("scout-test",2026,"BRA1"),club=league.clubs[0],target=league.clubs[1].players[0];
  const report=scoutingReport(target,club,0);
  expect(report.overall).toMatch(/\d/);
  expect(report.confidence).toBeGreaterThanOrEqual(20);
 });
 it("medical and market profiles react to player context",()=>{
  const league=createLeague("market-test",2026,"BRA1"),buyer=league.clubs[0],seller=league.clubs[1],player=seller.players[0];
  const med=medicalDepth(player,seller),market=humanMarketProfile(player,buyer,seller);
  expect(med.recurrenceRisk).toBeGreaterThanOrEqual(3);
  expect(market.salaryDemandMultiplier).toBeGreaterThan(0);
  expect(market.rejectionRisk).toBeGreaterThanOrEqual(2);
 });
 it("creates a persistent-style rival manager world",()=>{
  const league=createLeague("manager-test",2026,"BRA1"),managers=managerWorld(league,2026);
  expect(managers).toHaveLength(league.clubs.length);
  expect(managers[0].style.length).toBeGreaterThan(0);
 });
});
