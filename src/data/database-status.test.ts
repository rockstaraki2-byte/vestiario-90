import { describe, expect, it } from "vitest";
import { DATABASE_ENGINE_SUPPORTED_IDS, DATABASE_STATUS_ROWS, DATABASE_STATUS_SUMMARY } from "./database-status";

describe("database status health map",()=>{
 it("exposes all health dimensions for every competition",()=>{
  expect(DATABASE_STATUS_ROWS.length).toBeGreaterThan(0);
  for(const row of DATABASE_STATUS_ROWS){
   expect(["updated","partial","pending","error","na"]).toContain(row.calendarStatus);
   expect(["updated","partial","pending","error","na"]).toContain(row.engineStatus);
   expect(["updated","partial","pending","error","na"]).toContain(row.clubStatus);
   expect(["updated","partial","pending","error","na"]).toContain(row.rosterStatus);
   expect(["updated","partial","pending","error","na"]).toContain(row.crestStatus);
   expect(row.qualityScore).toBeGreaterThanOrEqual(0);
   expect(row.qualityScore).toBeLessThanOrEqual(100);
  }
 });

 it("keeps the currently implemented senior world engines visible in the audit",()=>{
  for(const id of DATABASE_ENGINE_SUPPORTED_IDS){
   const row=DATABASE_STATUS_ROWS.find(item=>item.id===id);
   expect(row,`missing status row for ${id}`).toBeDefined();
   expect(row?.engineStatus).toBe("updated");
  }
 });

 it("does not treat a confirmed calendar alone as a complete competition",()=>{
  const calendarOnly=DATABASE_STATUS_ROWS.find(row=>row.category==="Copa nacional"&&row.calendarStatus==="updated"&&row.engineStatus!=="updated");
  expect(calendarOnly).toBeDefined();
  expect(calendarOnly?.qualityScore).toBeLessThan(80);
  expect(calendarOnly?.alerts.some(item=>item.code==="missing-engine")).toBe(true);
 });

 it("keeps Brazilian state quality defects explicit",()=>{
  const states=DATABASE_STATUS_ROWS.filter(row=>row.category==="Estadual");
  expect(states).toHaveLength(27);
  for(const row of states){
   expect(row.virtualClubs,`${row.id} contains virtual clubs`).toBe(0);
   expect(row.suspiciousPlayers,`${row.id} contains suspicious players`).toBe(0);
   expect(row.missingCrestClubs,`${row.id} contains clubs without a valid crest`).toBe(0);
   if(row.shortRosterClubs>0){
    expect(row.rosterStatus).toBe("partial");
    expect(row.alerts.some(item=>item.code==="short-roster")).toBe(true);
   }else{
    expect(row.rosterStatus).toBe("updated");
   }
  }
 });

 it("keeps summary counters consistent",()=>{
  expect(DATABASE_STATUS_SUMMARY.total).toBe(DATABASE_STATUS_ROWS.length);
  expect(DATABASE_STATUS_SUMMARY.healthy+DATABASE_STATUS_SUMMARY.attention+DATABASE_STATUS_SUMMARY.critical).toBe(DATABASE_STATUS_ROWS.length);
  expect(DATABASE_STATUS_SUMMARY.alerts).toBe(DATABASE_STATUS_ROWS.reduce((sum,row)=>sum+row.alerts.length,0));
 });
});