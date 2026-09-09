import { SeededRng } from "./rng";
import { PROFESSIONAL_COMPETITIONS, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";
import type { LeaguePlayer } from "./league";
import type { SeasonState } from "./season";
import { applyArrivalImpact, applyDepartureImpact } from "./social";
import type { LivingWorldState } from "./world-events";

export type InternationalTarget = {
  id: string;
  competitionId: ProfessionalCompetitionId;
  competitionName: string;
  country: string;
  clubTransfermarktId: number;
  clubName: string;
  playerTransfermarktId: string;
  name: string;
  position: string;
  age: number;
  marketValueEur: number | null;
};
export type InternationalOfferStatus = "Pendente" | "Aceita" | "Recusada" | "Concluída" | "Expirada";
export type InternationalOffer = {
  id: string;
  direction: "Entrada" | "Saída";
  type?: "Compra" | "Empréstimo";
  externalClubName: string;
  externalCompetitionId: ProfessionalCompetitionId;
  playerId: string;
  playerName: string;
  targetId?: string;
  feeEur: number;
  salaryBrlMonthly: number;
  createdRound: number;
  expiresRound: number;
  status: InternationalOfferStatus;
  message: string;
};
export type InternationalDeal = {
  id: string;
  year: number;
  round: number;
  playerName: string;
  from: string;
  to: string;
  feeEur: number;
  kind: "Usuário" | "IA x IA";
};
export type InternationalSagaStage =
  | "Análise da diretoria"
  | "Contato internacional"
  | "Negociação entre clubes"
  | "Termos pessoais"
  | "Documentação"
  | "Concluída"
  | "Encerrada";
export type InternationalSaga = {
  id: string;
  direction: "Entrada" | "Saída";
  type: "Compra" | "Empréstimo";
  targetId?: string;
  playerId: string;
  playerName: string;
  externalClubName: string;
  externalCompetitionId: ProfessionalCompetitionId;
  stage: InternationalSagaStage;
  createdDate: string;
  nextActionDate: string;
  referenceFeeEur: number;
  agreedFeeEur?: number;
  offerId?: string;
  leaked: boolean;
  rivalClubName?: string;
  timeline: { date: string; label: string; detail: string }[];
};
export type InternationalMarketState = {
  sequence: number;
  offers: InternationalOffer[];
  history: InternationalDeal[];
  signedTargetIds: string[];
  negotiations?: InternationalSaga[];
  lastProcessedRound?: number;
  lastProcessedDate?: string;
};
export type InternationalMarketResult = { state: SeasonState; message: string };

const AGENTS = ["Global Eleven", "Prime Football", "Atlas Sports", "Bridge Agency", "Elite Player Group", "Mundo Soccer"];
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const labelDate = (iso: string) => {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
};

export function createInternationalMarket(): InternationalMarketState {
  return { sequence: 0, offers: [], history: [], signedTargetIds: [], negotiations: [] };
}
export function hydrateInternationalMarket(state?: InternationalMarketState): InternationalMarketState {
  if (!state) return createInternationalMarket();
  return {
    ...state,
    sequence: state.sequence ?? 0,
    offers: (state.offers ?? []).map((offer) => ({ ...offer })),
    history: (state.history ?? []).map((deal) => ({ ...deal })),
    signedTargetIds: [...(state.signedTargetIds ?? [])],
    negotiations: (state.negotiations ?? []).map((saga) => ({
      ...saga,
      timeline: (saga.timeline ?? []).map((event) => ({ ...event })),
    })),
  };
}
export function isGlobalTransferWindowOpen(date: string, competitionId: ProfessionalCompetitionId) {
  const month = Number(date.slice(5, 7));
  return competitionId.startsWith("BRA") ? [1, 2, 3, 7, 8, 9].includes(month) : [1, 6, 7, 8, 9].includes(month);
}
export function globalWindowLabel(competitionId: ProfessionalCompetitionId) {
  return competitionId.startsWith("BRA") ? "jan–mar / jul–set" : "jan / jun–set";
}
function targetId(compId: string, clubId: number, playerId: string) {
  return `${compId}:${clubId}:${playerId}`;
}
function baseOverall(value: number | null, age: number) {
  let overall = value === null ? 61 : value >= 120_000_000 ? 90 : value >= 80_000_000 ? 87 : value >= 50_000_000 ? 83 : value >= 30_000_000 ? 80 : value >= 15_000_000 ? 76 : value >= 7_000_000 ? 72 : value >= 3_000_000 ? 68 : value >= 1_000_000 ? 65 : 61;
  if (age <= 19) overall -= 2;
  if (age >= 34) overall -= 2;
  return clamp(overall, 55, 94);
}
function marketSalary(value: number | null, overall: number, age: number) {
  const base = value ? value * 0.032 : Math.max(100_000, (overall - 55) * 30_000);
  const factor = age <= 21 ? 0.75 : age >= 33 ? 0.8 : 1;
  return Math.max(45_000, Math.round((base * factor) / 5_000) * 5_000);
}
function potential(overall: number, age: number) {
  return clamp(overall + (age <= 19 ? 10 : age <= 21 ? 8 : age <= 23 ? 5 : age <= 25 ? 3 : age <= 28 ? 1 : 0), overall, 95);
}
function nextId(market: InternationalMarketState, prefix: string) {
  market.sequence += 1;
  return `${prefix}-${market.sequence}`;
}
function sagas(market: InternationalMarketState) {
  if (!market.negotiations) market.negotiations = [];
  return market.negotiations;
}
function active(saga: InternationalSaga) {
  return saga.stage !== "Concluída" && saga.stage !== "Encerrada";
}
function addTimeline(saga: InternationalSaga, date: string, label: string, detail: string) {
  saga.timeline.unshift({ date, label, detail });
  saga.timeline = saga.timeline.slice(0, 20);
}
function recommendedFee(target: InternationalTarget) {
  const value = target.marketValueEur ?? 1_000_000;
  return Math.max(250_000, Math.round((value * 1.08) / 100_000) * 100_000);
}

export function listInternationalTargets(state: SeasonState, query = ""): InternationalTarget[] {
  const q = query.trim().toLowerCase();
  const signed = new Set(state.internationalMarket?.signedTargetIds ?? []);
  return PROFESSIONAL_COMPETITIONS.flatMap((competition) =>
    competition.id === state.competitionId
      ? []
      : competition.clubs.flatMap((club) =>
          club.players.map(
            (player): InternationalTarget => ({
              id: targetId(competition.id, club.transfermarktId, player.transfermarktId),
              competitionId: competition.id,
              competitionName: competition.name,
              country: competition.country,
              clubTransfermarktId: club.transfermarktId,
              clubName: club.name,
              playerTransfermarktId: player.transfermarktId,
              name: player.name,
              position: player.position,
              age: player.age,
              marketValueEur: player.marketValueEur,
            }),
          ),
        ),
  )
    .filter(
      (item) =>
        !signed.has(item.id) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.clubName.toLowerCase().includes(q) ||
          item.position.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q)),
    )
    .sort((a, b) => (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0));
}
function findTarget(state: SeasonState, id: string) {
  return listInternationalTargets(state).find((target) => target.id === id);
}
function toLeaguePlayer(target: InternationalTarget, state: SeasonState): LeaguePlayer {
  const rng = new SeededRng(`${state.baseSeed}:international-player:${target.id}`);
  const overall = baseOverall(target.marketValueEur, target.age);
  const salary = marketSalary(target.marketValueEur, overall, target.age);
  return {
    id: `intl-${target.competitionId}-${target.playerTransfermarktId}-${state.year}-${state.currentRound}`,
    transfermarktId: target.playerTransfermarktId,
    name: target.name,
    position: target.position,
    age: target.age,
    marketValueEur: target.marketValueEur,
    overall,
    potential: potential(overall, target.age),
    seasonStartOverall: overall,
    developmentProgress: 0,
    overallHistory: [{ year: state.year, round: state.currentRound, overall, reason: "início" }],
    morale: 76,
    condition: 96,
    fatigue: 4,
    form: 6,
    goals: 0,
    assists: 0,
    shots: 0,
    yellowCards: 0,
    redCards: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    cleanSheets: 0,
    ratingTotal: 0,
    ratedMatches: 0,
    averageRating: 0,
    lastRating: 0,
    injuryDays: 0,
    suspensionMatches: 0,
    status: "Reserva",
    personality: rng.pick(["Profissional", "Ambicioso", "Competitivo", "Leal", "Reservado", "Temperamental"] as const),
    squadRole: target.age <= 21 ? "Promessa" : "Rotação",
    happiness: 72,
    managerTrust: 58,
    appearances: 0,
    starts: 0,
    minutes: 0,
    promises: [],
    contract: {
      salaryBrlMonthly: salary,
      startYear: state.year,
      endYear: state.year + 3,
      agentName: rng.pick(AGENTS),
      releaseClauseEur: target.marketValueEur ? Math.round((target.marketValueEur * 1.8) / 100_000) * 100_000 : null,
    },
    transferListed: false,
    wantsToLeave: false,
  };
}

function cloneWorld(world: LivingWorldState): LivingWorldState {
  return {
    ...world,
    inbox: world.inbox.map((event) => ({ ...event, choices: event.choices.map((choice) => ({ ...choice, effect: { ...choice.effect } })) })),
    news: world.news.map((news) => ({ ...news })),
  };
}
function inform(world: LivingWorldState, id: string, title: string, body: string, round: number, kind: "Diretoria" | "Empresário" | "Vazamento" = "Diretoria") {
  world.sequence += 1;
  world.inbox = [
    {
      id,
      kind,
      title,
      body,
      round,
      createdOrder: world.sequence,
      unread: true,
      resolved: false,
      choices: [{ id: `ack-${id}`, label: "Ciente", outcome: "Informação registrada.", effect: {} }],
    },
    ...world.inbox,
  ].slice(0, 90);
}
function publish(world: LivingWorldState, id: string, headline: string, summary: string, round: number, tone: "positive" | "neutral" | "negative" = "neutral") {
  world.sequence += 1;
  world.news = [
    { id, headline, summary, source: "Mercado internacional • simulação", round, createdOrder: world.sequence, tone },
    ...world.news,
  ].slice(0, 120);
}

/* Compatibilidade: cria somente a proposta formal. A UI nova usa requestInternationalInterest. */
export function makeInternationalOffer(state: SeasonState, targetIdValue: string): InternationalMarketResult {
  if (!isGlobalTransferWindowOpen(state.currentDate, state.competitionId)) {
    return { state, message: `Janela internacional fechada (${globalWindowLabel(state.competitionId)}).` };
  }
  const target = findTarget(state, targetIdValue);
  if (!target) return { state, message: "Jogador internacional não encontrado ou já contratado." };
  const market = hydrateInternationalMarket(state.internationalMarket);
  const club = state.league.clubs.find((item) => item.id === state.selectedClubId)!;
  const fee = recommendedFee(target);
  const salary = Math.round((marketSalary(target.marketValueEur, baseOverall(target.marketValueEur, target.age), target.age) * 1.12) / 5_000) * 5_000;
  if (fee > club.transferBudgetEur) return { state, message: "Orçamento insuficiente para a proposta internacional." };
  const offer: InternationalOffer = {
    id: nextId(market, "intl-offer"),
    direction: "Entrada",
    type: "Compra",
    externalClubName: target.clubName,
    externalCompetitionId: target.competitionId,
    playerId: target.playerTransfermarktId,
    playerName: target.name,
    targetId: target.id,
    feeEur: fee,
    salaryBrlMonthly: salary,
    createdRound: state.currentRound,
    expiresRound: state.currentRound + 2,
    status: "Pendente",
    message: "Proposta internacional enviada.",
  };
  market.offers.unshift(offer);
  return { state: { ...state, internationalMarket: market }, message: offer.message };
}

export function requestInternationalInterest(
  state: SeasonState,
  targetIdValue: string,
  type: "Compra" | "Empréstimo" = "Compra",
): InternationalMarketResult {
  const target = findTarget(state, targetIdValue);
  if (!target) return { state, message: "Jogador internacional não encontrado." };
  const market = hydrateInternationalMarket(state.internationalMarket);
  const duplicate = sagas(market).find((saga) => saga.targetId === target.id && active(saga));
  if (duplicate) return { state, message: `Já existe um processo por ${target.name}: ${duplicate.stage}.` };
  const rng = new SeededRng(`${state.baseSeed}:${state.currentDate}:intl-interest:${target.id}:${type}`);
  const reference = type === "Compra" ? recommendedFee(target) : Math.max(100_000, Math.round((recommendedFee(target) * 0.06) / 50_000) * 50_000);
  const saga: InternationalSaga = {
    id: nextId(market, "intl-neg"),
    direction: "Entrada",
    type,
    targetId: target.id,
    playerId: target.playerTransfermarktId,
    playerName: target.name,
    externalClubName: target.clubName,
    externalCompetitionId: target.competitionId,
    stage: "Análise da diretoria",
    createdDate: state.currentDate,
    nextActionDate: addDays(state.currentDate, rng.integer(1, 2)),
    referenceFeeEur: reference,
    leaked: false,
    timeline: [],
  };
  addTimeline(saga, state.currentDate, "Interesse do treinador", `Você pediu à diretoria que avalie ${type.toLowerCase()} por ${target.name}. Nenhum contato formal foi feito ainda.`);
  sagas(market).unshift(saga);
  return {
    state: { ...state, internationalMarket: market },
    message: `Interesse internacional registrado. A diretoria deve responder até ${labelDate(saga.nextActionDate)}.`,
  };
}

/* Nome antigo mantido para compatibilidade; agora apenas registra o interesse. */
export function directorMakeInternationalOffer(state: SeasonState, targetIdValue: string): InternationalMarketResult {
  return requestInternationalInterest(state, targetIdValue, "Compra");
}

function finishIncoming(state: SeasonState, market: InternationalMarketState, offer: InternationalOffer) {
  const league = {
    ...state.league,
    clubs: state.league.clubs.map((club) => ({ ...club, players: club.players.map((player) => ({ ...player, contract: { ...player.contract } })) })),
  };
  const club = league.clubs.find((item) => item.id === state.selectedClubId)!;
  const index = club.players.findIndex((player) => player.id === offer.playerId);
  if (index < 0) return { state: { ...state, league, internationalMarket: market }, message: "Jogador não está mais no elenco." };
  const player = club.players[index];
  const social = applyDepartureImpact(club, player.id);
  club.players.splice(index, 1);
  club.transferBudgetEur += offer.feeEur;
  offer.status = "Concluída";
  offer.message = `${player.name} foi negociado com ${offer.externalClubName}. ${social}`;
  market.history.unshift({
    id: nextId(market, "intl-deal"),
    year: state.year,
    round: state.currentRound,
    playerName: player.name,
    from: club.name,
    to: offer.externalClubName,
    feeEur: offer.feeEur,
    kind: "Usuário",
  });
  return {
    state: {
      ...state,
      league,
      internationalMarket: market,
      lineupIds: state.lineupIds.filter((id) => id !== player.id),
      benchIds: state.benchIds.filter((id) => id !== player.id),
    },
    message: offer.message,
  };
}

export function concludeInternationalOffer(state: SeasonState, offerId: string): InternationalMarketResult {
  const market = hydrateInternationalMarket(state.internationalMarket);
  const offer = market.offers.find((item) => item.id === offerId);
  if (!offer || offer.direction !== "Entrada" || offer.status !== "Aceita" || !offer.targetId) {
    return { state, message: "Negociação internacional indisponível." };
  }
  const target = findTarget({ ...state, internationalMarket: market } as SeasonState, offer.targetId);
  if (!target) return { state, message: "O jogador não está mais disponível." };
  const league = {
    ...state.league,
    clubs: state.league.clubs.map((club) => ({ ...club, players: club.players.map((player) => ({ ...player, contract: { ...player.contract } })) })),
  };
  const club = league.clubs.find((item) => item.id === state.selectedClubId)!;
  if (offer.feeEur > club.transferBudgetEur) return { state, message: "Orçamento insuficiente no momento do registro." };
  const player = toLeaguePlayer(target, state);
  player.contract.salaryBrlMonthly = offer.salaryBrlMonthly;
  club.players.push(player);
  club.transferBudgetEur -= offer.feeEur;
  market.signedTargetIds.push(target.id);
  offer.status = "Concluída";
  offer.message = `${target.name} chega do ${target.clubName}. ${applyArrivalImpact(club, player.id)}`;
  market.history.unshift({
    id: nextId(market, "intl-deal"),
    year: state.year,
    round: state.currentRound,
    playerName: target.name,
    from: target.clubName,
    to: club.name,
    feeEur: offer.feeEur,
    kind: "Usuário",
  });
  return { state: { ...state, league, internationalMarket: market }, message: offer.message };
}

export function finalizeInternationalOfferByBoard(state: SeasonState, offerId: string): InternationalMarketResult {
  const offer = state.internationalMarket.offers.find((item) => item.id === offerId);
  const saga = state.internationalMarket.negotiations?.find((item) => item.offerId === offerId);
  if (saga && active(saga)) return { state, message: `Diretoria de Futebol: a operação ainda está em ${saga.stage}.` };
  if (!offer) return { state, message: "Operação internacional não encontrada." };
  return concludeInternationalOffer(state, offerId);
}

export function respondInternationalIncoming(state: SeasonState, offerId: string, accept: boolean): InternationalMarketResult {
  const market = hydrateInternationalMarket(state.internationalMarket);
  const offer = market.offers.find((item) => item.id === offerId);
  if (!offer || offer.direction !== "Saída" || offer.status !== "Pendente") return { state, message: "Proposta internacional indisponível." };
  if (!accept) {
    offer.status = "Recusada";
    offer.message = "A diretoria recusou a oferta internacional.";
    return { state: { ...state, internationalMarket: market }, message: offer.message };
  }
  offer.status = "Aceita";
  return finishIncoming(state, market, offer);
}

export function reviewInternationalIncomingByBoard(state: SeasonState, offerId: string): InternationalMarketResult {
  const offer = state.internationalMarket.offers.find((item) => item.id === offerId);
  const saga = state.internationalMarket.negotiations?.find((item) => item.offerId === offerId);
  if (saga && active(saga)) return { state, message: `Diretoria de Futebol: análise em andamento (${saga.stage}).` };
  if (!offer) return { state, message: "A proposta internacional não está disponível." };
  return { state, message: `Diretoria de Futebol: ${offer.message}` };
}

function externalPool(activeCompetition: ProfessionalCompetitionId) {
  return PROFESSIONAL_COMPETITIONS.flatMap((competition) =>
    competition.id === activeCompetition
      ? []
      : competition.clubs.map((club) => ({ competitionId: competition.id, name: club.name, club })),
  );
}

function createIncomingSaga(state: SeasonState, market: InternationalMarketState, world: LivingWorldState, offer: InternationalOffer) {
  if (sagas(market).some((saga) => saga.offerId === offer.id)) return;
  const saga: InternationalSaga = {
    id: nextId(market, "intl-neg"),
    direction: "Saída",
    type: offer.type ?? "Compra",
    playerId: offer.playerId,
    playerName: offer.playerName,
    externalClubName: offer.externalClubName,
    externalCompetitionId: offer.externalCompetitionId,
    stage: "Análise da diretoria",
    createdDate: state.currentDate,
    nextActionDate: addDays(state.currentDate, 1 + (offer.id.length % 2)),
    referenceFeeEur: offer.feeEur,
    agreedFeeEur: offer.feeEur,
    offerId: offer.id,
    leaked: false,
    timeline: [],
  };
  addTimeline(saga, state.currentDate, "Proposta internacional recebida", `${offer.externalClubName} apresentou ${formatEur(offer.feeEur)} por ${offer.playerName}. A diretoria vai decidir nos próximos dias.`);
  sagas(market).unshift(saga);
  publish(world, `intl-offer-news-${offer.id}`, `${offer.externalClubName} procura ${offer.playerName}`, `O clube apresentou uma proposta ao seu time. A operação ainda depende da diretoria e do atleta.`, state.currentRound);
  inform(world, `intl-offer-inbox-${offer.id}`, `Proposta internacional por ${offer.playerName}`, `${offer.externalClubName} ofereceu ${formatEur(offer.feeEur)}. A diretoria fará a avaliação e informará sua decisão; o treinador não precisa responder à proposta.`, state.currentRound);
}

function processEntrySaga(state: SeasonState, market: InternationalMarketState, world: LivingWorldState, saga: InternationalSaga, rng: SeededRng) {
  const target = saga.targetId ? findTarget({ ...state, internationalMarket: market } as SeasonState, saga.targetId) : undefined;
  if (!target) {
    saga.stage = "Encerrada";
    addTimeline(saga, state.currentDate, "Processo encerrado", "O jogador deixou de estar disponível.");
    return state;
  }
  const club = state.league.clubs.find((item) => item.id === state.selectedClubId)!;
  if (saga.stage === "Análise da diretoria") {
    const fee = saga.referenceFeeEur;
    const overall = baseOverall(target.marketValueEur, target.age);
    const affordable = fee <= club.transferBudgetEur * 1.12;
    const useful = overall >= club.players.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, club.players.length) - 4;
    const approved = affordable && useful && rng.integer(1, 100) <= Math.min(94, 45 + state.livingWorld.boardConfidence * 0.38 + (target.age <= 24 ? 5 : 0));
    if (!approved) {
      saga.stage = "Encerrada";
      addTimeline(saga, state.currentDate, "Diretoria rejeita indicação", "Custo, salário projetado ou prioridade esportiva impediram a abordagem.");
      inform(world, `intl-reject-${saga.id}`, `Diretoria descarta ${target.name}`, "O departamento de futebol decidiu não abrir a negociação internacional neste momento.", state.currentRound);
      return state;
    }
    saga.stage = "Contato internacional";
    saga.nextActionDate = addDays(state.currentDate, rng.integer(1, 2));
    addTimeline(saga, state.currentDate, "Abordagem autorizada", `O diretor de futebol recebeu autorização para procurar ${target.clubName} e o estafe de ${target.name}.`);
    inform(world, `intl-approved-${saga.id}`, `Diretoria aprova interesse em ${target.name}`, "O contato internacional será feito pela diretoria. Nenhuma proposta formal foi enviada ainda.", state.currentRound);
    return state;
  }
  if (saga.stage === "Contato internacional") {
    const pool = externalPool(state.competitionId).filter((item) => item.name !== target.clubName);
    if (pool.length && rng.integer(1, 100) <= Math.min(70, 20 + Math.max(0, baseOverall(target.marketValueEur, target.age) - 70) * 2)) {
      saga.rivalClubName = pool[rng.integer(0, Math.min(20, pool.length - 1))].name;
    }
    if (rng.integer(1, 100) <= 28 + (saga.rivalClubName ? 18 : 0)) {
      saga.leaked = true;
      publish(world, `intl-leak-${saga.id}`, `${club.name} consulta situação de ${target.name}`, `${saga.rivalClubName ? `${saga.rivalClubName} também monitora o jogador. ` : ""}O vazamento pode aumentar a pedida.`, state.currentRound);
      inform(world, `intl-leak-inbox-${saga.id}`, `Negociação por ${target.name} vazou`, "A abordagem internacional apareceu na imprensa. A diretoria alerta para possível concorrência e aumento de preço.", state.currentRound, "Vazamento");
    }
    saga.stage = "Negociação entre clubes";
    saga.nextActionDate = addDays(state.currentDate, rng.integer(2, 5));
    addTimeline(saga, state.currentDate, "Contato realizado", `${target.clubName} abriu canal com a diretoria.${saga.rivalClubName ? ` ${saga.rivalClubName} também demonstra interesse.` : ""}`);
    return state;
  }
  if (saga.stage === "Negociação entre clubes") {
    if (!isGlobalTransferWindowOpen(state.currentDate, state.competitionId)) {
      saga.nextActionDate = addDays(state.currentDate, 2);
      addTimeline(saga, state.currentDate, "Aguardando janela", "O diálogo segue informal, mas a proposta e o registro aguardam a janela internacional.");
      return state;
    }
    const premium = (saga.rivalClubName ? 0.08 : 0) + (saga.leaked ? 0.05 : 0);
    const fee = saga.type === "Compra" ? Math.round((recommendedFee(target) * (1 + premium)) / 100_000) * 100_000 : Math.max(100_000, Math.round((recommendedFee(target) * 0.06 * (1 + premium)) / 50_000) * 50_000);
    if (fee > club.transferBudgetEur) {
      saga.stage = "Encerrada";
      addTimeline(saga, state.currentDate, "Preço inviável", `${target.clubName} elevou a pedida para ${formatEur(fee)} e a diretoria abandonou a operação.`);
      return state;
    }
    saga.agreedFeeEur = fee;
    const offer: InternationalOffer = {
      id: nextId(market, "intl-offer"),
      direction: "Entrada",
      type: saga.type,
      externalClubName: target.clubName,
      externalCompetitionId: target.competitionId,
      playerId: target.playerTransfermarktId,
      playerName: target.name,
      targetId: target.id,
      feeEur: fee,
      salaryBrlMonthly: Math.round((marketSalary(target.marketValueEur, baseOverall(target.marketValueEur, target.age), target.age) * 1.12) / 5_000) * 5_000,
      createdRound: state.currentRound,
      expiresRound: state.currentRound + 2,
      status: "Aceita",
      message: "Princípio de acordo entre clubes.",
    };
    market.offers.unshift(offer);
    saga.offerId = offer.id;
    saga.stage = "Termos pessoais";
    saga.nextActionDate = addDays(state.currentDate, rng.integer(1, 3));
    addTimeline(saga, state.currentDate, "Acordo entre clubes", `${club.name} e ${target.clubName} chegaram a um princípio de acordo por ${formatEur(fee)}.`);
    inform(world, `intl-club-agreement-${saga.id}`, `Acordo internacional por ${target.name}`, `Os clubes chegaram a um princípio de acordo por ${formatEur(fee)}. Agora a diretoria negocia com o estafe do jogador.`, state.currentRound);
    return state;
  }
  if (saga.stage === "Termos pessoais") {
    const offer = market.offers.find((item) => item.id === saga.offerId);
    if (!offer) {
      saga.stage = "Encerrada";
      return state;
    }
    const prestige = club.reputation - 68;
    const rivalPenalty = saga.rivalClubName ? 10 : 0;
    const chance = clamp(58 + prestige * 1.5 + (offer.salaryBrlMonthly / Math.max(1, marketSalary(target.marketValueEur, baseOverall(target.marketValueEur, target.age), target.age)) - 1) * 75 - rivalPenalty, 15, 94);
    if (rng.integer(1, 100) > chance) {
      offer.status = "Recusada";
      saga.stage = "Encerrada";
      addTimeline(saga, state.currentDate, "Jogador rejeita projeto", `${target.name} e seu estafe não chegaram a acordo com a diretoria.`);
      publish(world, `intl-player-reject-${saga.id}`, `${target.name} não acerta com ${club.name}`, "A negociação foi encerrada depois de divergências nos termos pessoais e no projeto esportivo.", state.currentRound, "neutral");
      return state;
    }
    saga.stage = "Documentação";
    saga.nextActionDate = addDays(state.currentDate, rng.integer(2, 4));
    addTimeline(saga, state.currentDate, "Termos pessoais aceitos", "Jogador e empresário deram sinal verde. Exames, contratos e registro estão em andamento.");
    inform(world, `intl-player-agree-${saga.id}`, `${target.name} aceita projeto`, "Os termos pessoais estão acertados. A contratação ainda depende da documentação e do registro.", state.currentRound, "Empresário");
    return state;
  }
  if (saga.stage === "Documentação") {
    const offer = market.offers.find((item) => item.id === saga.offerId);
    if (!offer || !isGlobalTransferWindowOpen(state.currentDate, state.competitionId)) {
      if (offer) offer.status = "Expirada";
      saga.stage = "Encerrada";
      addTimeline(saga, state.currentDate, "Registro não concluído", "A operação perdeu o prazo de registro internacional.");
      return state;
    }
    const result = concludeInternationalOffer({ ...state, internationalMarket: market }, offer.id);
    const resultMarket = hydrateInternationalMarket(result.state.internationalMarket);
    saga.stage = result.state === state ? "Encerrada" : "Concluída";
    addTimeline(saga, state.currentDate, saga.stage === "Concluída" ? "Transferência registrada" : "Registro falhou", result.message);
    resultMarket.negotiations = sagas(market);
    const finalState = { ...result.state, internationalMarket: resultMarket };
    if (saga.stage === "Concluída") {
      publish(world, `intl-done-${saga.id}`, `${target.name} é anunciado pelo ${club.name}`, `A operação internacional foi registrada após negociação entre clubes, termos pessoais e documentação.`, state.currentRound, "positive");
      inform(world, `intl-done-inbox-${saga.id}`, `Transferência internacional concluída: ${target.name}`, result.message, state.currentRound);
    }
    return { ...finalState, livingWorld: world };
  }
  return state;
}

function processExitSaga(state: SeasonState, market: InternationalMarketState, world: LivingWorldState, saga: InternationalSaga, rng: SeededRng) {
  const offer = market.offers.find((item) => item.id === saga.offerId);
  const club = state.league.clubs.find((item) => item.id === state.selectedClubId)!;
  const player = club.players.find((item) => item.id === saga.playerId);
  if (!offer || !player) {
    saga.stage = "Encerrada";
    return state;
  }
  if (saga.stage === "Análise da diretoria") {
    const ratio = offer.feeEur / Math.max(300_000, player.marketValueEur ?? 1_000_000);
    const same = club.players.filter((candidate) => candidate.position === player.position);
    const accept = (player.transferListed && ratio >= 0.9) || (player.wantsToLeave && ratio >= 0.92) || (player.age >= 31 && ratio >= 0.98) || (ratio >= 1.2 && same.length >= 3);
    if (!accept) {
      offer.status = "Recusada";
      saga.stage = "Encerrada";
      addTimeline(saga, state.currentDate, "Diretoria recusa oferta", `O clube rejeitou ${formatEur(offer.feeEur)} e manteve ${player.name} no planejamento.`);
      inform(world, `intl-in-reject-${saga.id}`, `Diretoria recusa oferta por ${player.name}`, `A proposta do ${offer.externalClubName} foi rejeitada. O atleta permanece no planejamento.`, state.currentRound);
      publish(world, `intl-in-reject-news-${saga.id}`, `${club.name} rejeita oferta por ${player.name}`, `A diretoria não aceitou os termos apresentados pelo ${offer.externalClubName}.`, state.currentRound);
      return state;
    }
    offer.status = "Aceita";
    saga.stage = "Termos pessoais";
    saga.nextActionDate = addDays(state.currentDate, rng.integer(1, 2));
    addTimeline(saga, state.currentDate, "Diretoria aceita negociar", `A proposta de ${formatEur(offer.feeEur)} foi aceita. Agora a decisão passa pelo jogador.`);
    inform(world, `intl-in-board-${saga.id}`, `Diretoria aceita proposta por ${player.name}`, `O clube aceitou negociar com ${offer.externalClubName}. O jogador e seu estafe ainda precisam aprovar a mudança.`, state.currentRound);
    return state;
  }
  if (saga.stage === "Termos pessoais") {
    const prestige = PROFESSIONAL_COMPETITIONS.find((competition) => competition.id === offer.externalCompetitionId)?.clubs.find((external) => external.name === offer.externalClubName)?.marketValueEur ?? 0;
    const chance = clamp(55 + (player.wantsToLeave ? 18 : 0) + (player.personality === "Ambicioso" ? 8 : 0) + (prestige > club.marketValueEur ? 8 : 0), 18, 94);
    if (rng.integer(1, 100) > chance) {
      offer.status = "Recusada";
      saga.stage = "Encerrada";
      addTimeline(saga, state.currentDate, "Jogador decide ficar", `${player.name} recusou os termos e permanecerá no ${club.name}.`);
      inform(world, `intl-in-player-stay-${saga.id}`, `${player.name} recusa transferência`, `O jogador optou por permanecer no clube após conversar com seu estafe.`, state.currentRound, "Empresário");
      publish(world, `intl-in-stay-news-${saga.id}`, `${player.name} permanece no ${club.name}`, `O atleta não chegou a acordo com ${offer.externalClubName}.`, state.currentRound);
      return state;
    }
    saga.stage = "Documentação";
    saga.nextActionDate = addDays(state.currentDate, rng.integer(1, 3));
    addTimeline(saga, state.currentDate, "Jogador aceita mudança", `${player.name} aceitou o projeto de ${offer.externalClubName}. Falta concluir a documentação.`);
    inform(world, `intl-in-player-agree-${saga.id}`, `${player.name} aceita proposta`, `O atleta aceitou a mudança. O jurídico agora prepara o registro e a documentação.`, state.currentRound, "Empresário");
    return state;
  }
  if (saga.stage === "Documentação") {
    const result = finishIncoming({ ...state, internationalMarket: market }, market, offer);
    saga.stage = "Concluída";
    addTimeline(saga, state.currentDate, "Venda registrada", result.message);
    const resultMarket = hydrateInternationalMarket(result.state.internationalMarket);
    resultMarket.negotiations = sagas(market);
    publish(world, `intl-sale-done-${saga.id}`, `${player.name} deixa o ${club.name}`, `A transferência para ${offer.externalClubName} foi concluída por ${formatEur(offer.feeEur)}.`, state.currentRound, "neutral");
    inform(world, `intl-sale-inbox-${saga.id}`, `Saída concluída: ${player.name}`, result.message, state.currentRound);
    return { ...result.state, internationalMarket: resultMarket, livingWorld: world };
  }
  return state;
}

export function processInternationalMarketRound(state: SeasonState): SeasonState {
  const market = hydrateInternationalMarket(state.internationalMarket);
  let world = cloneWorld(state.livingWorld);
  let nextState = { ...state, internationalMarket: market, livingWorld: world };

  if (market.lastProcessedDate !== state.currentDate) {
    market.lastProcessedDate = state.currentDate;
    for (const offer of market.offers.filter((item) => item.direction === "Saída" && item.status === "Pendente")) {
      createIncomingSaga(nextState, market, world, offer);
    }
    for (const saga of sagas(market)) {
      if (!active(saga) || saga.nextActionDate > state.currentDate) continue;
      const rng = new SeededRng(`${state.baseSeed}:${saga.id}:${state.currentDate}:${saga.stage}`);
      nextState = saga.direction === "Entrada"
        ? processEntrySaga(nextState, market, world, saga, rng)
        : processExitSaga(nextState, market, world, saga, rng);
      world = nextState.livingWorld;
    }
  }

  if (market.lastProcessedRound !== state.currentRound && isGlobalTransferWindowOpen(state.currentDate, state.competitionId)) {
    market.lastProcessedRound = state.currentRound;
    const rng = new SeededRng(`${state.baseSeed}:global-market:r${state.currentRound}`);
    const club = nextState.league.clubs.find((item) => item.id === nextState.selectedClubId)!;
    const externals = externalPool(state.competitionId);
    if (externals.length && club.players.length && rng.integer(1, 100) <= 58) {
      const activePlayers = new Set(sagas(market).filter(active).map((saga) => saga.playerId));
      const available = club.players.filter((player) => !activePlayers.has(player.id));
      if (available.length) {
        const player = rng.pick([...available].sort((a, b) => (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0)).slice(0, Math.min(12, available.length)));
        const buyer = rng.pick(externals);
        const fee = Math.max(300_000, Math.round(((player.marketValueEur ?? 1_000_000) * rng.integer(92, 125)) / 100 / 100_000) * 100_000);
        const offer: InternationalOffer = {
          id: nextId(market, "intl-in"),
          direction: "Saída",
          type: "Compra",
          externalClubName: buyer.name,
          externalCompetitionId: buyer.competitionId,
          playerId: player.id,
          playerName: player.name,
          feeEur: fee,
          salaryBrlMonthly: Math.round((player.contract.salaryBrlMonthly * 1.15) / 5_000) * 5_000,
          createdRound: state.currentRound,
          expiresRound: state.currentRound + 2,
          status: "Pendente",
          message: `${buyer.name} fez uma proposta internacional por ${player.name}.`,
        };
        market.offers.unshift(offer);
        createIncomingSaga(nextState, market, world, offer);
      }
    }
    if (externals.length >= 2 && rng.integer(1, 100) <= 72) {
      const seller = rng.pick(externals);
      const buyers = externals.filter((item) => item.name !== seller.name);
      const buyer = rng.pick(buyers);
      const players = seller.club.players.filter((player) => player.marketValueEur !== null);
      if (players.length) {
        const player = rng.pick(players);
        const fee = Math.max(200_000, Math.round(((player.marketValueEur ?? 1_000_000) * rng.integer(90, 120)) / 100 / 100_000) * 100_000);
        market.history.unshift({
          id: nextId(market, "ai-deal"),
          year: state.year,
          round: state.currentRound,
          playerName: player.name,
          from: seller.name,
          to: buyer.name,
          feeEur: fee,
          kind: "IA x IA",
        });
      }
    }
  }
  market.history = market.history.slice(0, 120);
  market.negotiations = sagas(market).slice(0, 100);
  return { ...nextState, internationalMarket: market, livingWorld: world };
}

export function prepareInternationalMarketNextSeason(
  state: InternationalMarketState,
): InternationalMarketState {
  const market = hydrateInternationalMarket(state);
  market.lastProcessedRound = undefined;
  market.lastProcessedDate = undefined;
  market.offers = market.offers.filter((offer) => offer.status === "Concluída").slice(0, 100);
  market.negotiations = sagas(market).filter((saga) => !active(saga)).slice(0, 80);
  return market;
}

/* Alias histórico utilizado pelo season engine. */
export function prepareInternationalMarketNextSeasonLegacy(state: InternationalMarketState) {
  return prepareInternationalMarketNextSeason(state);
}

export { prepareInternationalMarketNextSeason as prepareInternationalMarketNextSeasonState };
export function prepareInternationalMarketNextSeasonForYear(state: InternationalMarketState) {
  return prepareInternationalMarketNextSeason(state);
}

export function formatEur(value: number) {
  return value >= 1_000_000
    ? `€ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`
    : `€ ${Math.round(value / 1_000).toLocaleString("pt-BR")} mil`;
}
