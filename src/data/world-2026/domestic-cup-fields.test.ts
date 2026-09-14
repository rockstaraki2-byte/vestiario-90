import { describe, expect, it } from "vitest";
import { PROFESSIONAL_COMPETITIONS } from "../brazil-2026/competitions";
import { DOMESTIC_CUP_FIELD_CONFIGS, domesticCupClubKey, domesticCupConfirmedNames, resolveDomesticCupField } from "./domestic-cup-fields";

describe("Sprint 6 domestic cup fields",()=>{
 it("builds complete real engine-entry fields for all supported domestic cups",()=>{
  expect(DOMESTIC_CUP_FIELD_CONFIGS).toHaveLength(5);
  for(const config of DOMESTIC_CUP_FIELD_CONFIGS){
   const resolved=resolveDomesticCupField(config.id);
   expect(resolved.clubs,`${config.id} incomplete`).toHaveLength(config.fieldSize);
   expect(new Set(resolved.clubs.map(club=>domesticCupClubKey(club.name))).size,`${config.id} duplicate clubs`).toBe(config.fieldSize);
   expect(resolved.clubs.some(club=>/^(?:fa cup|carabao cup|copa do brasil|copa del rey|coupe de france)\s+\d+$/i.test(club.name))).toBe(false);
  }
 });

 it("resolves every confirmed 2026 participant without a substitute",()=>{
  for(const id of ["CDB","EFL"] as const){
   const field=resolveDomesticCupField(id);
   expect(field.unresolvedConfirmed,`${id} has unresolved confirmed clubs`).toEqual([]);
   const actual=new Set(field.clubs.map(club=>domesticCupClubKey(club.name)));
   const expected=domesticCupConfirmedNames(id).map(domesticCupClubKey);
   for(const key of expected)expect(actual.has(key),`${id} missing ${key}`).toBe(true);
  }
 });

 it("keeps automatic top-flight entrants in future-draw fields",()=>{
  for(const [cupId,leagueId] of [["FAC","ENG1"],["CDR","ESP1"],["CDF","FRA1"]] as const){
   const field=resolveDomesticCupField(cupId),actual=new Set(field.clubs.map(club=>domesticCupClubKey(club.name)));
   const top=PROFESSIONAL_COMPETITIONS.find(comp=>comp.id===leagueId);
   expect(top).toBeDefined();
   for(const club of top?.clubs??[])expect(actual.has(domesticCupClubKey(club.name)),`${cupId} missing top-flight entrant ${club.name}`).toBe(true);
  }
 });
});
