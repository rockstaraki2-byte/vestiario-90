import { describe,expect,it } from "vitest";
import { createLeague } from "./league";
import { scoutingReport } from "./depth-systems";
import { playerAttributeProfile } from "./player-attributes";

describe("Sprint B — scouting and attributes 2.0",()=>{
 it("builds stable technical mental and physical attributes",()=>{
  const league=createLeague("scouting-b",2026,"BRA1"),player=league.clubs[1].players[0],a=playerAttributeProfile(player),b=playerAttributeProfile(player);
  expect(a.technical).toHaveLength(6);expect(a.mental).toHaveLength(6);expect(a.physical).toHaveLength(6);expect(a).toEqual(b);
 });
 it("narrows uncertainty as observations accumulate",()=>{
  const league=createLeague("scouting-b",2026,"BRA1"),club=league.clubs[0],player=league.clubs[1].players[0],initial=scoutingReport(player,club,0),observed=scoutingReport(player,club,4);
  expect(observed.knowledge).toBeGreaterThanOrEqual(initial.knowledge);expect(observed.confidence).toBeGreaterThanOrEqual(initial.confidence);expect(observed.attributeGroups).toHaveLength(3);expect(observed.attributeGroups.every(group=>group.attributes.length===6)).toBe(true);expect(observed.stars).toBeGreaterThanOrEqual(1);expect(observed.stars).toBeLessThanOrEqual(5);
 });
});
