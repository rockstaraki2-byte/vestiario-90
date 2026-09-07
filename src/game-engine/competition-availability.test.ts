import { describe, expect, it } from "vitest";
import { competitionAvailability } from "./competition-availability";
import { createSeason, getSelectedClub } from "./season";
import { TACTICAL_STYLE_PRESETS, applyTacticalStyle } from "./tactical-presets";
import { DEFAULT_TACTIC } from "./match";

describe("competition availability and tactical presets",()=>{
  it("explica lesão e suspensão específica da competição",()=>{
    const season=createSeason("availability",2026),club=getSelectedClub(season),player=club.players[0];
    player.injuryDays=4;
    expect(competitionAvailability(season.competitionGovernance,"LIB",player).reason).toContain("Lesionado");
    player.injuryDays=0;
    season.competitionGovernance.registrations.LIB={competitionId:"LIB",season:2026,clubId:club.id,listAIds:[player.id],listBIds:[],changesUsed:0,lastSyncedStage:"Fase de grupos"};
    season.competitionGovernance.discipline[`LIB:${player.id}`]={competitionId:"LIB",playerId:player.id,yellows:3,yellowSuspensions:1,reds:0,suspensionMatches:1};
    expect(competitionAvailability(season.competitionGovernance,"LIB",player).reason).toContain("Suspenso nesta competição");
  });

  it("distingue jogador não inscrito",()=>{
    const season=createSeason("registration",2026),club=getSelectedClub(season),player=club.players[0];
    season.competitionGovernance.registrations.LIB={competitionId:"LIB",season:2026,clubId:club.id,listAIds:[],listBIds:[],changesUsed:0,lastSyncedStage:"Fase de grupos"};
    expect(competitionAvailability(season.competitionGovernance,"LIB",player).reason).toContain("Não inscrito");
  });

  it("aplica identidades táticas completas sem apagar bolas paradas",()=>{
    const preset=TACTICAL_STYLE_PRESETS.find(item=>item.id==="gegenpress")!;
    const next=applyTacticalStyle(DEFAULT_TACTIC,preset);
    expect(next.pressing).toBe(88);
    expect(next.defensiveLine).toBe("Alta");
    expect(next.setPieces).toEqual(DEFAULT_TACTIC.setPieces);
  });
});
