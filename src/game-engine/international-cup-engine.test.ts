import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{createWorldCompetitions}from"./world-competitions";
import{INTERNATIONAL_CUP_FIELD_CONFIGS,resolveInternationalCupField}from"../data/world-2026/international-cup-fields";

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

describe("Sprint 7 continental engine integration",()=>{
 it("inicia as cinco competições apenas com participantes reais do snapshot",()=>{
  const league=createLeague("sprint7-intl",2026,"BRA1"),world=createWorldCompetitions("BRA1",league,2026,"sprint7-intl");
  for(const config of INTERNATIONAL_CUP_FIELD_CONFIGS){
   const tournament=world.tournaments.find(item=>item.definition.id===config.id);
   const field=resolveInternationalCupField(config.id);
   expect(tournament).toBeDefined();
   expect(tournament!.participants).toHaveLength(config.expectedParticipants);
   expect(tournament!.participants.some(club=>club.id.startsWith("virtual-"))).toBe(false);
   expect(new Set(tournament!.participants.map(club=>club.id)).size).toBe(config.expectedParticipants);
   const realNames=new Set(field.clubs.map(club=>normalize(club.name)));
   expect(tournament!.participants.every(club=>realNames.has(normalize(club.name)))).toBe(true);
  }
 });
 it("preserva vínculo com clubes da liga ativa quando eles disputam torneio continental",()=>{
  const league=createLeague("sprint7-link",2026,"BRA1"),world=createWorldCompetitions("BRA1",league,2026,"sprint7-link");
  const continental=world.tournaments.filter(item=>INTERNATIONAL_CUP_FIELD_CONFIGS.some(config=>config.id===item.definition.id));
  expect(continental.flatMap(item=>item.participants).some(club=>Boolean(club.activeClubId))).toBe(true);
 });
});
