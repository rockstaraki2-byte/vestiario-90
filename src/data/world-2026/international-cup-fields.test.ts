import{describe,expect,it}from"vitest";
import{INTERNATIONAL_CUP_FIELD_CONFIGS,resolveInternationalCupField}from"./international-cup-fields";

describe("Sprint 7 continental competition fields",()=>{
 it("mantém os cinco campos com quantidade exata e identidade única",()=>{
  for(const config of INTERNATIONAL_CUP_FIELD_CONFIGS){
   const field=resolveInternationalCupField(config.id);
   expect(field.participantIds).toHaveLength(config.expectedParticipants);
   expect(field.clubs).toHaveLength(config.expectedParticipants);
   expect(new Set(field.participantIds).size).toBe(config.expectedParticipants);
   expect(new Set(field.clubs.map(club=>String(club.transfermarktId))).size).toBe(config.expectedParticipants);
  }
 });
 it("não aceita placeholders e exige elenco real mínimo",()=>{
  for(const config of INTERNATIONAL_CUP_FIELD_CONFIGS){
   const field=resolveInternationalCupField(config.id);
   for(const club of field.clubs){
    expect(`${club.name} ${club.shortName??""}`.toLowerCase()).not.toMatch(/virtual|placeholder|fict[ií]cio/);
    expect(club.players.length).toBeGreaterThanOrEqual(config.minimumRosterSize);
    expect(String(club.transfermarktId)).toMatch(/^\d+$/);
   }
  }
 });
});
