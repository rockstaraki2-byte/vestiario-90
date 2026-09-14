import { describe, expect, it } from "vitest";
import { completeRealQualificationField, NEXT_SEASON_TOP_LEAGUE_SLOTS, qualificationClubKey, realContinentalFallbackPool } from "./next-season-qualification";

const expected={LIB:32,SUD:32,UCL:36,UEL:36,UECL:36} as const;

describe("Sprint 9 next-season qualification",()=>{
 it("completes every continental field with real unique clubs only",()=>{
  for(const [id,count] of Object.entries(expected) as Array<[keyof typeof expected,number]>){
   const field=completeRealQualificationField([],id,count);
   expect(field).toHaveLength(count);
   expect(new Set(field.map(item=>qualificationClubKey(item.name))).size).toBe(count);
   expect(field.some(item=>/classificado|virtual|placeholder|fict/i.test(item.name))).toBe(false);
   expect(field.every(item=>item.reason.includes("real"))).toBe(true);
  }
 });

 it("keeps UEFA competitions disjoint when previous fields are blocked",()=>{
  const ucl=completeRealQualificationField([],"UCL",36);
  const uclKeys=new Set(ucl.map(item=>qualificationClubKey(item.name)));
  const uel=completeRealQualificationField([],"UEL",36,uclKeys);
  const all=new Set([...uclKeys,...uel.map(item=>qualificationClubKey(item.name))]);
  expect(all.size).toBe(72);
  const uecl=completeRealQualificationField([],"UECL",36,all);
  expect(new Set([...all,...uecl.map(item=>qualificationClubKey(item.name))]).size).toBe(108);
 });

 it("covers the loaded big-six European domestic leagues in the qualification rules",()=>{
  expect(NEXT_SEASON_TOP_LEAGUE_SLOTS.UCL).toEqual(expect.objectContaining({ENG1:4,ESP1:4,GER1:4,ITA1:4,FRA1:3,POR1:2}));
  expect(realContinentalFallbackPool("UCL").length).toBeGreaterThanOrEqual(36);
 });
});
