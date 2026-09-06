import { describe, expect, it } from "vitest";
import { createSeason, playCurrentRound, resolveSeasonWorldChoice, startNextSeason } from "./season";
import type { MatchResult } from "./match";

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
  it("aceita o resultado jogado de forma interativa",()=>{
    const initial=createSeason("interativa",2026);
    const override:MatchResult={homeGoals:4,awayGoals:1,possessionHome:55,shotsHome:14,shotsAway:7,events:[{minute:90,type:"fulltime",team:"neutral",text:"fim"}]};
    const next=playCurrentRound(initial,undefined,override,initial.lineupIds);
    expect(next.lastUserMatch?.result.homeGoals).toBe(4);
    expect(next.lastUserMatch?.result.awayGoals).toBe(1);
  });
  it("troca o clube controlado ao aceitar uma proposta de emprego",()=>{
    const season=createSeason("troca-clube",2026),target=season.league.clubs[1];
    season.livingWorld.inbox.unshift({id:"career-offer-test",kind:"Carreira",title:"Proposta de teste",body:"Um clube quer contratar o treinador.",round:1,createdOrder:999,unread:true,resolved:false,choices:[{id:"accept-test-job",label:"Aceitar",outcome:"Proposta aceita.",effect:{},careerAction:"accept-job",careerClubId:target.id}]});
    const result=resolveSeasonWorldChoice(season,"career-offer-test","accept-test-job");
    expect(result.state.selectedClubId).toBe(target.id);
    expect(result.state.career.currentClubId).toBe(target.id);
    expect(result.state.lineupIds).toHaveLength(11);
    expect(result.state.lineupIds.every(id=>target.players.some(player=>player.id===id))).toBe(true);
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
