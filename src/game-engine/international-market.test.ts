import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{createInternationalMarket,isGlobalTransferWindowOpen,listInternationalTargets,makeInternationalOffer}from"./international-market";

describe("international market",()=>{
 it("abre janelas por calendário",()=>{expect(isGlobalTransferWindowOpen("2026-08-15","ENG1")).toBe(true);expect(isGlobalTransferWindowOpen("2026-11-15","ENG1")).toBe(false);expect(isGlobalTransferWindowOpen("2026-08-15","BRA1")).toBe(true)});
 it("lista jogadores reais de outras ligas",()=>{const season=createSeason("intl-targets",2026,undefined,"BRA1");season.internationalMarket=createInternationalMarket();const targets=listInternationalTargets(season);expect(targets.length).toBeGreaterThan(500);expect(targets.some(t=>t.country==="Inglaterra")).toBe(true)});
 it("registra uma proposta internacional do usuário",()=>{const season=createSeason("intl-offer",2026,undefined,"BRA1");season.currentDate="2026-08-10";season.internationalMarket=createInternationalMarket();const target=listInternationalTargets(season).find(t=>(t.marketValueEur??0)<season.league.clubs[0].transferBudgetEur*.6)??listInternationalTargets(season)[0];const result=makeInternationalOffer(season,target.id);expect(result.state.internationalMarket.offers.length).toBe(1);expect(result.state.internationalMarket.offers[0].playerName).toBe(target.name)});
});
