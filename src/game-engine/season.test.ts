import { describe, expect, it } from "vitest";
import { createSeason, playCurrentRound, startNextSeason } from "./season";

describe("season engine",()=>{
  it("conclui uma rodada e atualiza toda a tabela",()=>{
    const season=playCurrentRound(createSeason("temporada",2026));
    expect(season.currentRound).toBe(2);
    expect(new Set(season.league.standings.map(s=>s.played))).toEqual(new Set([1]));
    expect(season.lastUserMatch).toBeTruthy();
  });

  it("é determinística para a mesma seed",()=>{
    const a=playCurrentRound(createSeason("deterministica",2026));
    const b=playCurrentRound(createSeason("deterministica",2026));
    expect(a.lastUserMatch?.result).toEqual(b.lastUserMatch?.result);
    expect(a.league.standings).toEqual(b.league.standings);
  });

  it("fecha 38 rodadas e permite virar a temporada",()=>{
    let season=createSeason("carreira",2026);
    for(let round=1;round<=38;round++)season=playCurrentRound(season);
    expect(season.completed).toBe(true);
    expect(new Set(season.league.standings.map(s=>s.played))).toEqual(new Set([38]));
    expect(season.championClubId).toBeTruthy();
    const next=startNextSeason(season);
    expect(next.year).toBe(2027);
    expect(next.currentRound).toBe(1);
    expect(new Set(next.league.standings.map(s=>s.played))).toEqual(new Set([0]));
  });
});
