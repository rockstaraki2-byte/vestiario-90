import { describe, expect, it } from "vitest";
import { DATABASE_STATUS_ROWS } from "./database-status";
import { DOMESTIC_CUP_FIELD_CONFIGS } from "./world-2026/domestic-cup-fields";

describe("Sprint 6 domestic cup database status",()=>{
 it("audits real engine-entry participants instead of empty cup rows",()=>{
  for(const config of DOMESTIC_CUP_FIELD_CONFIGS){
   const row=DATABASE_STATUS_ROWS.find(item=>item.id===config.id);
   expect(row,`${config.id} status missing`).toBeDefined();
   expect(row?.engineStatus).toBe("updated");
   expect(row?.clubs).toBe(config.fieldSize);
   expect(row?.expectedClubs).toBe(config.fieldSize);
   expect(row?.virtualClubs).toBe(0);
   expect(row?.alerts.some(item=>item.code==="missing-clubs")).toBe(false);
  }
 });
});
