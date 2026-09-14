import { describe, expect, it } from "vitest";
import { createLeague } from "./league";
import { createWorldCompetitions } from "./world-competitions";
import { DOMESTIC_CUP_FIELD_CONFIGS, domesticCupClubKey, domesticCupConfirmedNames } from "../data/world-2026/domestic-cup-fields";

describe("Sprint 6 domestic cup engine",()=>{
 it("creates every supported domestic cup with a complete non-virtual field",()=>{
  const league=createLeague("sprint6-cups",2026,"BRA1"),world=createWorldCompetitions("BRA1",league,2026,"sprint6-cups");
  for(const config of DOMESTIC_CUP_FIELD_CONFIGS){
   const tournament=world.tournaments.find(item=>item.definition.id===config.id);
   expect(tournament,`${config.id} missing`).toBeDefined();
   expect(tournament?.participants,`${config.id} wrong field size`).toHaveLength(config.fieldSize);
   expect(tournament?.participants.some(item=>item.id.startsWith("virtual-")),`${config.id} contains virtual participant`).toBe(false);
   expect(new Set((tournament?.participants??[]).map(item=>domesticCupClubKey(item.name))).size).toBe(config.fieldSize);
  }
 });

 it("uses the confirmed 2026 fields for Copa do Brasil and Carabao Cup",()=>{
  const league=createLeague("sprint6-confirmed",2026,"ENG1"),world=createWorldCompetitions("ENG1",league,2026,"sprint6-confirmed");
  for(const id of ["CDB","EFL"] as const){
   const tournament=world.tournaments.find(item=>item.definition.id===id)!;
   const actual=new Set(tournament.participants.map(item=>domesticCupClubKey(item.name)));
   for(const name of domesticCupConfirmedNames(id))expect(actual.has(domesticCupClubKey(name)),`${id} missing ${name}`).toBe(true);
  }
 });

 it("does not misclassify the active league country when building the global pool",()=>{
  const league=createLeague("sprint6-country",2026,"ESP1"),world=createWorldCompetitions("ESP1",league,2026,"sprint6-country");
  const club=league.clubs[0],participant=world.tournaments.flatMap(t=>t.participants).find(item=>item.activeClubId===club.id);
  expect(participant?.country).toBe("Espanha");
 });
});
