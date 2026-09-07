import { describe, expect, it } from "vitest";
import { createSeason, getSelectedClub, setMatchdayRole } from "./season";

describe("matchday selection resilience",()=>{
  it("permite retirar do banco um jogador que ficou indisponível",()=>{
    const season=createSeason("blocked-out",2026),club=getSelectedClub(season),playerId=season.benchIds[0],player=club.players.find(item=>item.id===playerId)!;
    player.injuryDays=3;
    const next=setMatchdayRole(season,playerId,"out");
    expect(next.benchIds).not.toContain(playerId);
  });
});
