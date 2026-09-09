import { describe, expect, it } from "vitest";
import { createSeason } from "./season";
import { processMarketRound, recommendedOffer, requestTransferInterest } from "./market";
import { listInternationalTargets, requestInternationalInterest } from "./international-market";

describe("Mercado 3.0 — negociações persistentes", () => {
  it("manifestar interesse não transfere o jogador no mesmo dia", () => {
    const season = createSeason("saga-interest");
    season.league.clubs[0].transferBudgetEur = 200_000_000;
    season.league.clubs[0].wageBudgetBrlMonthly = 200_000_000;
    const seller = season.league.clubs[1];
    const target = seller.players[0];
    const beforeBuyer = season.league.clubs[0].players.length;
    const beforeSeller = seller.players.length;

    const result = requestTransferInterest(season, target.id, "Compra");
    const saga = result.state.market.negotiations?.[0];

    expect(saga?.stage).toBe("Análise da diretoria");
    expect(result.state.market.offers).toHaveLength(0);
    expect(result.state.league.clubs[0].players).toHaveLength(beforeBuyer);
    expect(result.state.league.clubs[1].players).toHaveLength(beforeSeller);
    expect(result.state.league.clubs[1].players.some((player) => player.id === target.id)).toBe(true);
  });

  it("a negociação só sai da etapa atual quando a data prevista chega", () => {
    const season = createSeason("saga-calendar");
    season.league.clubs[0].transferBudgetEur = 200_000_000;
    season.league.clubs[0].wageBudgetBrlMonthly = 200_000_000;
    const target = season.league.clubs[1].players[0];
    const requested = requestTransferInterest(season, target.id, "Compra").state;
    const saga = requested.market.negotiations?.[0];
    expect(saga).toBeDefined();

    const early = processMarketRound({ ...requested, currentDate: requested.currentDate });
    expect(early.market.negotiations?.[0].stage).toBe("Análise da diretoria");

    const due = processMarketRound({ ...early, currentDate: saga!.nextActionDate });
    expect(due.market.negotiations?.[0].stage).not.toBe("Análise da diretoria");
    expect(due.league.clubs[1].players.some((player) => player.id === target.id)).toBe(true);
  });

  it("proposta pelo elenco vira notícia e informativo da diretoria antes de qualquer saída", () => {
    const season = createSeason("incoming-information");
    const seller = season.league.clubs[0];
    const buyer = season.league.clubs[1];
    const player = seller.players[0];
    season.market.offers.push({
      id: "incoming-saga-test",
      type: "Compra",
      buyerClubId: buyer.id,
      sellerClubId: seller.id,
      playerId: player.id,
      feeEur: recommendedOffer(player) * 2,
      salaryBrlMonthly: player.contract.salaryBrlMonthly * 2,
      createdRound: season.currentRound,
      expiresRound: season.currentRound + 2,
      status: "Pendente",
      message: "proposta recebida",
    });

    const result = processMarketRound(season);
    const saga = result.market.negotiations?.find((item) => item.offerId === "incoming-saga-test");

    expect(saga?.direction).toBe("Saída");
    expect(saga?.stage).toBe("Análise da diretoria");
    expect(result.league.clubs[0].players.some((candidate) => candidate.id === player.id)).toBe(true);
    expect(result.livingWorld.inbox.some((event) => event.title.includes(player.name))).toBe(true);
    expect(result.livingWorld.news.some((news) => news.headline.includes(player.name))).toBe(true);
  });

  it("save antigo sem a coleção de negociações é hidratado sem quebrar o mercado", () => {
    const season = createSeason("legacy-market-saga");
    delete season.market.negotiations;
    const result = processMarketRound(season);
    expect(Array.isArray(result.market.negotiations)).toBe(true);
  });

  it("interesse internacional também não cria contratação imediata", () => {
    const season = createSeason("international-interest");
    season.league.clubs[0].transferBudgetEur = 500_000_000;
    const target = listInternationalTargets(season)[0];
    expect(target).toBeDefined();
    const before = season.league.clubs[0].players.length;

    const result = requestInternationalInterest(season, target.id, "Compra");

    expect(result.state.league.clubs[0].players).toHaveLength(before);
    expect(result.state.internationalMarket.offers).toHaveLength(0);
    expect(result.state.internationalMarket.negotiations?.[0].stage).toBe("Análise da diretoria");
  });
});
