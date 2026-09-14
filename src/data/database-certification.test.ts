import{describe,expect,it}from"vitest";
import{DATABASE_CERTIFICATION_REPORT,certifyDatabase}from"./database-certification";
import{DATABASE_ENGINE_SUPPORTED_IDS}from"./database-status";

describe("Sprint 8 database certification",()=>{
 it("certifies every competition exposed by the playable senior world engine",()=>{
  const report=certifyDatabase("2026-09-14");
  expect(report.releaseRows).toBe(DATABASE_ENGINE_SUPPORTED_IDS.size);
  expect(report.blockingIssues,report.blockingIssues.map(item=>`${item.competitionId}: ${item.message}`).join("\n")).toEqual([]);
 });
 it("never tolerates virtual clubs or incomplete participant fields in release competitions",()=>{
  expect(DATABASE_CERTIFICATION_REPORT.blockingIssues.filter(item=>["virtual-club","participant-count","short-roster","suspicious-player"].includes(item.code))).toEqual([]);
 });
});
