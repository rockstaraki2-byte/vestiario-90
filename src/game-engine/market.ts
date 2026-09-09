import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer, LeagueWorld } from "./league";
import type { SeasonState } from "./season";
import { applyArrivalImpact, applyDepartureImpact } from "./social";
import type { LivingWorldState, WorldEventKind } from "./world-events";

export type TransferOfferType = "Compra" | "Empréstimo";
export type TransferOfferStatus = "Pendente" | "Aceita" | "Recusada" | "Concluída" | "Expirada";
export type TransferOffer = {
  id: string;
  type: TransferOfferType;
  buyerClubId: string;
  sellerClubId: string;
  playerId: string;
  feeEur: number;
  salaryBrlMonthly: number;
  createdRound: number;
  expiresRound: number;
  status: TransferOfferStatus;
  message: string;
  personalTermsAgreed?: boolean;
};
export type TransferRecord = {
  id: string;
  playerId?: string;
  playerName: string;
  fromClubId: string;
  toClubId: string;
  type: TransferOfferType;
  feeEur: number;
  round: number;
  year: number;
  managerName?: string;
  strategy?: string;
  reason?: string;
};
export type TransferNegotiationStage =
  | "Análise da diretoria"
  | "Contato inicial"
  | "Negociação com clube"
  | "Termos pessoais"
  | "Documentação"
  | "Concluída"
  | "Encerrada";
export type TransferNegotiationEvent = {
  date: string;
  label: string;
  detail: string;
  tone?: "positive" | "neutral" | "negative";
};
export type TransferNegotiation = {
  id: string;
  direction: "Entrada" | "Saída";
  type: TransferOfferType;
  playerId: string;
  playerName: string;
  buyerClubId: string;
  sellerClubId: string;
  createdDate: string;
  stage: TransferNegotiationStage;
  nextActionDate: string;
  estimatedFeeEur: number;
  agreedFeeEur?: number;
  salaryBrlMonthly?: number;
  boardApproved?: boolean;
  sellerAccepted?: boolean;
  playerAccepted?: boolean;
  documentationDays?: number;
  paperworkDelayCount?: number;
  negotiationRounds?: number;
  rivalClubIds: string[];
  leaked: boolean;
  waitingForWindow?: boolean;
  offerId?: string;
  timeline: TransferNegotiationEvent[];
};
export type MarketState = {
  sequence: number;
  offers: TransferOffer[];
  history: TransferRecord[];
  freeAgents: LeaguePlayer[];
  negotiations?: TransferNegotiation[];
  lastProcessedRound?: number;
  lastProcessedDate?: string;
};
export type MarketActionResult = { state: SeasonState; message: string };

export const FIRST_WINDOW_ROUNDS = [1, 6] as const;
export const SECOND_WINDOW_ROUNDS = [19, 26] as const;
export const SERIE_A_TRANSFER_APPEARANCE_LIMIT = 12;

export function createMarketState(): MarketState {
  return { sequence: 0, offers: [], history: [], freeAgents: [], negotiations: [] };
}
export function isTransferWindowOpen(round: number) {
  return (
    (round >= FIRST_WINDOW_ROUNDS[0] && round <= FIRST_WINDOW_ROUNDS[1]) ||
    (round >= SECOND_WINDOW_ROUNDS[0] && round <= SECOND_WINDOW_ROUNDS[1])
  );
}
export function clubWageSpend(club: LeagueClub) {
  return club.players.reduce((sum, player) => sum + (player.contract?.salaryBrlMonthly ?? 0), 0);
}
export function estimatedPlayerValue(player: LeaguePlayer) {
  return player.marketValueEur ?? Math.max(300_000, (player.overall - 55) * 550_000);
}
export function recommendedOffer(player: LeaguePlayer) {
  const base = estimatedPlayerValue(player);
  return Math.round((base * (player.transferListed || player.wantsToLeave ? 0.94 : 1.08)) / 100_000) * 100_000;
}
export function transferNegotiations(state: SeasonState) {
  return [...(state.market?.negotiations ?? [])].sort((a, b) => b.createdDate.localeCompare(a.createdDate));
}

function clonePlayer(player: LeaguePlayer): LeaguePlayer {
  return {
    ...player,
    contract: { ...player.contract },
    promises: (player.promises ?? []).map((promise) => ({ ...promise })),
  };
}
function cloneLeague(league: LeagueWorld): LeagueWorld {
  return {
    ...league,
    clubs: league.clubs.map((club) => ({ ...club, players: club.players.map(clonePlayer) })),
    fixtures: league.fixtures.map((fixture) => ({ ...fixture })),
    standings: league.standings.map((standing) => ({ ...standing })),
  };
}
function cloneMarket(source?: MarketState): MarketState {
  const market = source ?? createMarketState();
  return {
    ...market,
    sequence: market.sequence ?? 0,
    offers: (market.offers ?? []).map((offer) => ({ ...offer })),
    history: (market.history ?? []).map((record) => ({ ...record })),
    freeAgents: (market.freeAgents ?? []).map(clonePlayer),
    negotiations: (market.negotiations ?? []).map((item) => ({
      ...item,
      rivalClubIds: [...(item.rivalClubIds ?? [])],
      timeline: (item.timeline ?? []).map((event) => ({ ...event })),
    })),
  };
}
function withCopies(state: SeasonState) {
  return { league: cloneLeague(state.league), market: cloneMarket(state.market) };
}
function negotiations(market: MarketState) {
  if (!market.negotiations) market.negotiations = [];
  return market.negotiations;
}
function findPlayer(league: LeagueWorld, playerId: string) {
  for (const club of league.clubs) {
    const player = club.players.find((item) => item.id === playerId);
    if (player) return { club, player };
  }
  return undefined;
}
function canMoveInsideSerieA(player: LeaguePlayer) {
  return (player.appearances ?? 0) <= SERIE_A_TRANSFER_APPEARANCE_LIMIT;
}
function windowMessage() {
  return "A janela está fechada. A diretoria pode manter interesse e contatos informais, mas o registro só acontece durante a janela.";
}
function nextId(market: MarketState, prefix: string) {
  market.sequence = (market.sequence ?? 0) + 1;
  return `${prefix}-${market.sequence}`;
}
function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function dateLabel(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}
function isActive(item: TransferNegotiation) {
  return item.stage !== "Concluída" && item.stage !== "Encerrada";
}
function log(
  item: TransferNegotiation,
  date: string,
  label: string,
  detail: string,
  tone: TransferNegotiationEvent["tone"] = "neutral",
) {
  item.timeline.unshift({ date, label, detail, tone });
  item.timeline = item.timeline.slice(0, 24);
}

function cloneWorld(world: LivingWorldState): LivingWorldState {
  return {
    ...world,
    inbox: (world.inbox ?? []).map((event) => ({
      ...event,
      choices: event.choices.map((choice) => ({ ...choice, effect: { ...choice.effect } })),
    })),
    news: (world.news ?? []).map((item) => ({ ...item })),
  };
}
function addInbox(
  world: LivingWorldState,
  id: string,
  kind: WorldEventKind,
  title: string,
  body: string,
  round: number,
) {
  const order = world.sequence + 1;
  world.sequence = order;
  world.inbox = [
    {
      id,
      kind,
      title,
      body,
      round,
      createdOrder: order,
      unread: true,
      resolved: false,
      choices: [{ id: `ack-${id}`, label: "Ciente", outcome: "Informação registrada.", effect: {} }],
    },
    ...world.inbox,
  ].slice(0, 90);
}
function addNews(
  world: LivingWorldState,
  id: string,
  headline: string,
  summary: string,
  round: number,
  tone: "positive" | "neutral" | "negative" = "neutral",
) {
  const order = world.sequence + 1;
  world.sequence = order;
  world.news = [
    {
      id,
      headline,
      summary,
      source: "Mercado • bastidores (simulação)",
      round,
      createdOrder: order,
      tone,
    },
    ...world.news,
  ].slice(0, 120);
}

export function toggleTransferList(state: SeasonState, playerId: string): MarketActionResult {
  const { league, market } = withCopies(state);
  const club = league.clubs.find((item) => item.id === state.selectedClubId)!;
  const player = club.players.find((item) => item.id === playerId);
  if (!player) return { state, message: "Jogador não encontrado no seu elenco." };
  player.transferListed = !player.transferListed;
  if (player.transferListed) player.happiness = Math.max(0, player.happiness - 2);
  return {
    state: { ...state, league, market },
    message: player.transferListed
      ? `${player.name} foi colocado na lista de transferências.`
      : `${player.name} foi retirado da lista de transferências.`,
  };
}

export function renewPlayerContract(state: SeasonState, playerId: string, years = 3): MarketActionResult {
  const { league, market } = withCopies(state);
  const club = league.clubs.find((item) => item.id === state.selectedClubId)!;
  const player = club.players.find((item) => item.id === playerId);
  if (!player) return { state, message: "Jogador não encontrado." };
  const currentSalary = player.contract.salaryBrlMonthly;
  const marketSalary = Math.max(currentSalary, Math.round((estimatedPlayerValue(player) * 0.035) / 5_000) * 5_000);
  const proposed = Math.round((Math.max(currentSalary * 1.12, marketSalary) * 1.02) / 5_000) * 5_000;
  if (clubWageSpend(club) - currentSalary + proposed > club.wageBudgetBrlMonthly) {
    return { state, message: `O orçamento salarial não comporta a pedida de ${formatBrl(proposed)}/mês.` };
  }
  const rng = new SeededRng(`${state.baseSeed}:${state.year}:renew:${player.id}:r${state.currentRound}`);
  const relationship = (player.happiness + player.managerTrust) / 2;
  const personalityBonus = player.personality === "Leal" ? 12 : player.personality === "Ambicioso" ? -5 : 0;
  const chance = Math.max(20, Math.min(95, 50 + relationship - 60 + personalityBonus + (proposed / currentSalary - 1) * 80));
  if (rng.integer(1, 100) > chance) {
    player.happiness = Math.max(0, player.happiness - 2);
    return {
      state: { ...state, league, market },
      message: `${player.contract.agentName} recusou a proposta por ${player.name}. A pedida deve subir ou a relação precisa melhorar.`,
    };
  }
  player.contract = {
    ...player.contract,
    salaryBrlMonthly: proposed,
    startYear: state.year,
    endYear: Math.max(player.contract.endYear, state.year + years),
    releaseClauseEur:
      player.contract.releaseClauseEur ?? Math.round((estimatedPlayerValue(player) * 1.8) / 100_000) * 100_000,
  };
  player.managerTrust = Math.min(100, player.managerTrust + 4);
  player.happiness = Math.min(100, player.happiness + 5);
  player.wantsToLeave = false;
  return {
    state: { ...state, league, market },
    message: `Renovação fechada: ${player.name} até ${player.contract.endYear}, por ${formatBrl(proposed)}/mês.`,
  };
}

/* Compatibilidade para módulos antigos. A interface do treinador não usa mais esta ação diretamente. */
export function makeOfferForPlayer(
  state: SeasonState,
  playerId: string,
  type: TransferOfferType = "Compra",
): MarketActionResult {
  if (!isTransferWindowOpen(state.currentRound)) return { state, message: windowMessage() };
  const { league, market } = withCopies(state);
  const found = findPlayer(league, playerId);
  if (!found) return { state, message: "Jogador não encontrado." };
  const buyer = league.clubs.find((club) => club.id === state.selectedClubId)!;
  if (found.club.id === buyer.id) return { state, message: "Esse jogador já pertence ao seu clube." };
  if (!canMoveInsideSerieA(found.player)) {
    return {
      state,
      message: `${found.player.name} já superou o limite de ${SERIE_A_TRANSFER_APPEARANCE_LIMIT} jogos para trocar entre clubes da Série A.`,
    };
  }
  const base = recommendedOffer(found.player);
  const fee = type === "Compra" ? base : Math.max(100_000, Math.round((base * 0.06) / 50_000) * 50_000);
  const salary = Math.round((found.player.contract.salaryBrlMonthly * (type === "Compra" ? 1.14 : 1.05)) / 5_000) * 5_000;
  if (fee > buyer.transferBudgetEur) return { state, message: `O orçamento não comporta ${formatEur(fee)}.` };
  if (clubWageSpend(buyer) + salary > buyer.wageBudgetBrlMonthly) {
    return { state, message: `A contratação estouraria o teto salarial. Pedida prevista: ${formatBrl(salary)}/mês.` };
  }
  const offer: TransferOffer = {
    id: nextId(market, "offer"),
    type,
    buyerClubId: buyer.id,
    sellerClubId: found.club.id,
    playerId,
    feeEur: fee,
    salaryBrlMonthly: salary,
    createdRound: state.currentRound,
    expiresRound: state.currentRound + 1,
    status: "Pendente",
    message: "Proposta formal enviada.",
  };
  const ratio = fee / estimatedPlayerValue(found.player);
  const rng = new SeededRng(`${state.baseSeed}:${state.year}:${offer.id}:${found.club.id}`);
  const depthPenalty = found.club.players.filter((player) => player.position === found.player.position).length <= 2 ? -22 : 0;
  const motivation = found.player.transferListed ? 24 : found.player.wantsToLeave ? 18 : 0;
  const chance = Math.max(8, Math.min(95, 35 + (ratio - 1) * 90 + motivation + depthPenalty));
  if (rng.integer(1, 100) <= chance) {
    offer.status = "Aceita";
    offer.message = `${found.club.name} aceitou ${formatEur(fee)}. Falta concluir o acordo com o jogador.`;
  } else {
    offer.status = "Recusada";
    offer.message = `${found.club.name} recusou ${formatEur(fee)}.`;
  }
  market.offers.unshift(offer);
  return { state: { ...state, league, market }, message: offer.message };
}

function completeOffer(
  state: SeasonState,
  league: LeagueWorld,
  market: MarketState,
  offer: TransferOffer,
  skipPersonal = false,
) {
  const buyer = league.clubs.find((club) => club.id === offer.buyerClubId);
  const seller = league.clubs.find((club) => club.id === offer.sellerClubId);
  if (!buyer || !seller) return { ok: false, message: "Clubes da negociação não encontrados.", lineupIds: state.lineupIds, benchIds: state.benchIds };
  const index = seller.players.findIndex((player) => player.id === offer.playerId);
  if (index < 0) return { ok: false, message: "O jogador não está mais disponível.", lineupIds: state.lineupIds, benchIds: state.benchIds };
  const player = seller.players[index];
  if (!canMoveInsideSerieA(player)) return { ok: false, message: `${player.name} superou o limite de jogos permitido.`, lineupIds: state.lineupIds, benchIds: state.benchIds };
  if (offer.feeEur > buyer.transferBudgetEur) return { ok: false, message: "A diretoria perdeu margem orçamentária antes do registro.", lineupIds: state.lineupIds, benchIds: state.benchIds };
  if (!skipPersonal && !offer.personalTermsAgreed) {
    const rng = new SeededRng(`${state.baseSeed}:${state.year}:personal:${offer.id}`);
    const prestige = (buyer.reputation - seller.reputation) * 1.5;
    const raise = (offer.salaryBrlMonthly / Math.max(1, player.contract.salaryBrlMonthly) - 1) * 100;
    const mood = (player.happiness < 55 ? 18 : 0) + (player.wantsToLeave ? 20 : 0);
    const chance = Math.max(15, Math.min(96, 58 + prestige + raise + mood + (player.personality === "Ambicioso" ? 8 : 0)));
    if (rng.integer(1, 100) > chance) {
      offer.status = "Recusada";
      offer.message = `${player.name} e ${player.contract.agentName} recusaram os termos pessoais.`;
      return { ok: false, message: offer.message, lineupIds: state.lineupIds, benchIds: state.benchIds };
    }
  }
  const departureNote = applyDepartureImpact(seller, player.id);
  seller.players.splice(index, 1);
  buyer.players.push(player);
  buyer.transferBudgetEur -= offer.feeEur;
  seller.transferBudgetEur += offer.feeEur;
  player.contract = {
    ...player.contract,
    salaryBrlMonthly: offer.salaryBrlMonthly,
    startYear: state.year,
    endYear: state.year + (offer.type === "Compra" ? 3 : 1),
  };
  player.transferListed = false;
  player.wantsToLeave = false;
  player.happiness = Math.min(100, player.happiness + 6);
  player.managerTrust = 60;
  player.joinedClubYear = state.year;
  player.clubTrainedYears = 0;
  if (offer.type === "Empréstimo") {
    const loan = player as LeaguePlayer & { loanFromClubId?: string; loanReturnYear?: number };
    loan.loanFromClubId = seller.id;
    loan.loanReturnYear = state.year + 1;
  }
  const arrivalNote = applyArrivalImpact(buyer, player.id);
  const socialNote = buyer.id === state.selectedClubId ? arrivalNote : seller.id === state.selectedClubId ? departureNote : "";
  offer.status = "Concluída";
  offer.message = `${player.name} é reforço do ${buyer.name}.${socialNote ? ` ${socialNote}` : ""}`;
  market.history.unshift({
    id: nextId(market, "deal"),
    playerId: player.id,
    playerName: player.name,
    fromClubId: seller.id,
    toClubId: buyer.id,
    type: offer.type,
    feeEur: offer.feeEur,
    round: state.currentRound,
    year: state.year,
  });
  return {
    ok: true,
    message: offer.message,
    lineupIds: state.lineupIds.filter((id) => seller.id !== state.selectedClubId || id !== player.id),
    benchIds: state.benchIds.filter((id) => seller.id !== state.selectedClubId || id !== player.id),
  };
}

export function concludeAcceptedOffer(state: SeasonState, offerId: string): MarketActionResult {
  if (!isTransferWindowOpen(state.currentRound)) return { state, message: windowMessage() };
  const { league, market } = withCopies(state);
  const offer = market.offers.find((item) => item.id === offerId);
  if (!offer || offer.status !== "Aceita") return { state, message: "Essa proposta não está pronta para conclusão." };
  const result = completeOffer(state, league, market, offer);
  return {
    state: { ...state, league, market, lineupIds: result.lineupIds, benchIds: result.benchIds },
    message: result.message,
  };
}

export function respondToIncomingOffer(state: SeasonState, offerId: string, accept: boolean): MarketActionResult {
  const { league, market } = withCopies(state);
  const offer = market.offers.find((item) => item.id === offerId);
  if (!offer || offer.status !== "Pendente" || offer.sellerClubId !== state.selectedClubId) {
    return { state, message: "Proposta não disponível." };
  }
  if (!accept) {
    offer.status = "Recusada";
    offer.message = "A proposta foi recusada pela diretoria.";
    return { state: { ...state, league, market }, message: offer.message };
  }
  offer.status = "Aceita";
  return concludeAcceptedOffer({ ...state, league, market }, offer.id);
}

/* Compatibilidade para chamadas antigas e testes. O novo fluxo automático não usa esta resolução instantânea. */
export function reviewIncomingOfferByBoard(state: SeasonState, offerId: string): MarketActionResult {
  const offer = state.market.offers.find((item) => item.id === offerId);
  const club = state.league.clubs.find((item) => item.id === state.selectedClubId);
  if (!offer || !club || offer.sellerClubId !== club.id || offer.status !== "Pendente") {
    return { state, message: "A proposta não está pendente para análise da diretoria." };
  }
  const player = club.players.find((item) => item.id === offer.playerId);
  if (!player) return { state, message: "O jogador não está mais no elenco." };
  const value = estimatedPlayerValue(player);
  const ratio = offer.feeEur / Math.max(1, value);
  const samePosition = club.players.filter((item) => item.position === player.position);
  const average = club.players.reduce((sum, item) => sum + item.overall, 0) / Math.max(1, club.players.length);
  const keyPlayer = player.squadRole === "Titular" || player.overall >= average + 3;
  let accept =
    (player.transferListed && ratio >= 0.88) ||
    (player.wantsToLeave && ratio >= 0.9) ||
    (player.age >= 31 && ratio >= 0.95) ||
    (ratio >= 1.16 && samePosition.length >= 3);
  if (keyPlayer && ratio < 1.3) accept = false;
  if (samePosition.length <= 2 && !player.wantsToLeave) accept = false;
  const result = respondToIncomingOffer(state, offerId, accept);
  const resolved = result.state.market.offers.find((item) => item.id === offerId);
  const message = !accept
    ? `Diretoria de Futebol: proposta por ${player.name} recusada.`
    : resolved?.status === "Concluída"
      ? `Diretoria de Futebol: negociação de ${player.name} concluída por ${formatEur(offer.feeEur)}.`
      : `Diretoria de Futebol: o clube aceitou negociar ${player.name}. ${result.message}`;
  if (resolved) resolved.message = message;
  return { state: result.state, message };
}
export function finalizeAcceptedOfferByBoard(state: SeasonState, offerId: string): MarketActionResult {
  const result = concludeAcceptedOffer(state, offerId);
  return { state: result.state, message: `Diretoria de Futebol: ${result.message}` };
}

export function requestTransferInterest(
  state: SeasonState,
  playerId: string,
  type: TransferOfferType = "Compra",
): MarketActionResult {
  if (state.career?.status === "Sem clube") {
    return { state, message: "Você precisa estar empregado para manifestar interesse em um jogador." };
  }
  const { league, market } = withCopies(state);
  const buyer = league.clubs.find((club) => club.id === state.selectedClubId)!;
  const found = findPlayer(league, playerId);
  if (!found || found.club.id === buyer.id) return { state, message: "Escolha um jogador de outro clube." };
  if (!canMoveInsideSerieA(found.player)) {
    return { state, message: `${found.player.name} já superou o limite de jogos para uma transferência doméstica.` };
  }
  const active = negotiations(market).find((item) => item.direction === "Entrada" && item.playerId === playerId && isActive(item));
  if (active) return { state, message: `Já existe um processo por ${found.player.name}: ${active.stage}.` };
  const rng = new SeededRng(`${state.baseSeed}:${state.currentDate}:interest:${playerId}:${type}`);
  const reference =
    type === "Compra"
      ? recommendedOffer(found.player)
      : Math.max(100_000, Math.round((recommendedOffer(found.player) * 0.06) / 50_000) * 50_000);
  const nextActionDate = addDays(state.currentDate, rng.integer(1, 2));
  const item: TransferNegotiation = {
    id: nextId(market, "neg"),
    direction: "Entrada",
    type,
    playerId,
    playerName: found.player.name,
    buyerClubId: buyer.id,
    sellerClubId: found.club.id,
    createdDate: state.currentDate,
    stage: "Análise da diretoria",
    nextActionDate,
    estimatedFeeEur: reference,
    rivalClubIds: [],
    leaked: false,
    timeline: [],
  };
  log(
    item,
    state.currentDate,
    "Interesse do treinador",
    `Você indicou ${found.player.name} para ${type.toLowerCase()}. A diretoria fará análise esportiva e financeira antes de qualquer contato.`,
  );
  negotiations(market).unshift(item);
  return {
    state: { ...state, league, market },
    message: `Interesse registrado em ${found.player.name}. A diretoria deve responder até ${dateLabel(nextActionDate)}.`,
  };
}

type MarketContext = {
  state: SeasonState;
  league: LeagueWorld;
  market: MarketState;
  world: LivingWorldState;
  lineupIds: string[];
  benchIds: string[];
};
function closeSaga(
  ctx: MarketContext,
  item: TransferNegotiation,
  title: string,
  detail: string,
  tone: TransferNegotiationEvent["tone"] = "negative",
) {
  item.stage = "Encerrada";
  item.nextActionDate = ctx.state.currentDate;
  log(item, ctx.state.currentDate, title, detail, tone);
  addInbox(ctx.world, `market-close-${item.id}-${ctx.market.sequence}`, "Diretoria", title, detail, ctx.state.currentRound);
}
function chooseRivals(ctx: MarketContext, item: TransferNegotiation, player: LeaguePlayer, seller: LeagueClub, rng: SeededRng) {
  const value = estimatedPlayerValue(player);
  const candidates = ctx.league.clubs
    .filter(
      (club) =>
        club.id !== item.buyerClubId &&
        club.id !== seller.id &&
        club.transferBudgetEur >= value * 0.75 &&
        club.players.filter((candidate) => candidate.position === player.position).length <= 5,
    )
    .sort((a, b) => b.reputation - a.reputation);
  const attractiveness = Math.max(0, player.overall - 68) * 2 + (player.age <= 24 ? 10 : 0) + (player.transferListed || player.wantsToLeave ? 8 : 0);
  if (candidates.length && rng.integer(1, 100) <= Math.min(82, 18 + attractiveness)) {
    item.rivalClubIds = [candidates[rng.integer(0, Math.min(4, candidates.length - 1))].id];
    if (candidates.length > 4 && rng.integer(1, 100) <= 28) {
      item.rivalClubIds.push(candidates[rng.integer(0, Math.min(7, candidates.length - 1))].id);
    }
    item.rivalClubIds = [...new Set(item.rivalClubIds)];
  }
}
function maybeLeak(ctx: MarketContext, item: TransferNegotiation, player: LeaguePlayer, buyer: LeagueClub, seller: LeagueClub, rng: SeededRng) {
  if (item.leaked) return;
  const chance = Math.min(75, 16 + (player.overall >= 76 ? 15 : 0) + item.rivalClubIds.length * 14 + (buyer.reputation >= 75 ? 8 : 0));
  if (rng.integer(1, 100) > chance) return;
  item.leaked = true;
  const rivalNames = item.rivalClubIds
    .map((id) => ctx.league.clubs.find((club) => club.id === id)?.name)
    .filter(Boolean);
  log(
    item,
    ctx.state.currentDate,
    "Vazamento",
    `O interesse do ${buyer.name} chegou à imprensa. ${rivalNames.length ? `${rivalNames.join(" e ")} também acompanha(m) a situação.` : "Outros clubes podem entrar na disputa."}`,
    "negative",
  );
  addNews(
    ctx.world,
    `market-leak-${item.id}`,
    `${buyer.name} entra na disputa por ${player.name}`,
    `Fontes apontam contato pelo jogador do ${seller.name}. O vazamento pode elevar concorrência e preço.`,
    ctx.state.currentRound,
  );
  addInbox(
    ctx.world,
    `market-leak-inbox-${item.id}`,
    "Vazamento",
    `Interesse por ${player.name} vazou`,
    `A diretoria informa que a abordagem deixou de ser reservada. Isso fortalece a posição do ${seller.name}.`,
    ctx.state.currentRound,
  );
  ctx.world.mediaPressure = Math.min(100, ctx.world.mediaPressure + 2);
}

function reviewIncomingBoard(ctx: MarketContext, item: TransferNegotiation, offer: TransferOffer, player: LeaguePlayer, seller: LeagueClub, buyer: LeagueClub) {
  const ratio = offer.feeEur / Math.max(1, estimatedPlayerValue(player));
  const samePosition = seller.players.filter((candidate) => candidate.position === player.position);
  const average = seller.players.reduce((sum, candidate) => sum + candidate.overall, 0) / Math.max(1, seller.players.length);
  const keyPlayer = player.squadRole === "Titular" || player.overall >= average + 3;
  let accept =
    (player.transferListed && ratio >= 0.88) ||
    (player.wantsToLeave && ratio >= 0.9) ||
    (player.age >= 31 && ratio >= 0.95) ||
    (ratio >= 1.16 && samePosition.length >= 3);
  if (keyPlayer && ratio < 1.3) accept = false;
  if (samePosition.length <= 2 && !player.wantsToLeave) accept = false;
  item.boardApproved = accept;
  if (!accept) {
    offer.status = "Recusada";
    offer.message = `${seller.name} recusou a proposta do ${buyer.name}.`;
    closeSaga(
      ctx,
      item,
      `Diretoria recusa proposta por ${player.name}`,
      `A oferta de ${formatEur(offer.feeEur)} não compensou a importância esportiva e patrimonial do atleta.`,
      "neutral",
    );
    addNews(
      ctx.world,
      `market-incoming-rejected-${item.id}`,
      `${seller.name} rejeita investida por ${player.name}`,
      `A diretoria decidiu manter o atleta após analisar a proposta do ${buyer.name}.`,
      ctx.state.currentRound,
      "neutral",
    );
    return;
  }
  offer.status = "Aceita";
  offer.message = `${seller.name} aceitou negociar ${player.name} com ${buyer.name}.`;
  item.stage = "Termos pessoais";
  item.nextActionDate = addDays(ctx.state.currentDate, 1 + (item.id.length % 2));
  log(
    item,
    ctx.state.currentDate,
    "Diretoria aceita negociar",
    `O clube autorizou a saída por ${formatEur(offer.feeEur)}. Agora o estafe do jogador analisa o projeto.`,
    "positive",
  );
  addInbox(
    ctx.world,
    `market-board-accept-${item.id}`,
    "Diretoria",
    `Diretoria aceita proposta por ${player.name}`,
    `A proposta do ${buyer.name} foi aceita. A decisão final agora depende do jogador e de seu estafe.`,
    ctx.state.currentRound,
  );
  addNews(
    ctx.world,
    `market-board-news-${item.id}`,
    `${seller.name} aceita conversar sobre saída de ${player.name}`,
    `A negociação avançou, mas ainda depende de acordo pessoal e documentação.`,
    ctx.state.currentRound,
  );
}

function processOutgoingSaga(ctx: MarketContext, item: TransferNegotiation, player: LeaguePlayer, seller: LeagueClub, buyer: LeagueClub, rng: SeededRng) {
  if (item.stage === "Análise da diretoria") {
    const fee = item.estimatedFeeEur;
    const salary = Math.round((player.contract.salaryBrlMonthly * (item.type === "Compra" ? 1.14 : 1.05)) / 5_000) * 5_000;
    const wageHeadroom = Math.max(0, buyer.wageBudgetBrlMonthly - clubWageSpend(buyer));
    const sectorPlayers = buyer.players.filter((candidate) => candidate.position === player.position);
    const sectorAverage = sectorPlayers.length
      ? sectorPlayers.reduce((sum, candidate) => sum + candidate.overall, 0) / sectorPlayers.length
      : 65;
    const gap = player.overall - sectorAverage;
    const budgetRatio = fee / Math.max(1, buyer.transferBudgetEur);
    const wageRatio = salary / Math.max(1, wageHeadroom);
    const viable = budgetRatio <= 1.18 && wageRatio <= 1.25 && gap >= -4;
    const chance = Math.max(
      8,
      Math.min(
        96,
        44 + ctx.world.boardConfidence * 0.32 + gap * 3 + (player.age <= 24 ? 5 : 0) - (budgetRatio > 0.82 ? 12 : 0) - (wageRatio > 0.9 ? 10 : 0),
      ),
    );
    const approved = viable && rng.integer(1, 100) <= chance;
    item.boardApproved = approved;
    item.salaryBrlMonthly = salary;
    if (!approved) {
      closeSaga(
        ctx,
        item,
        `Diretoria descarta ${player.name}`,
        `Custo de ${formatEur(fee)}, salário estimado e encaixe do setor pesaram contra a abordagem.`,
      );
      return;
    }
    item.stage = "Contato inicial";
    item.nextActionDate = addDays(ctx.state.currentDate, rng.integer(1, 2));
    log(
      item,
      ctx.state.currentDate,
      "Diretoria autoriza abordagem",
      `O diretor de futebol vai procurar o ${seller.name} e o estafe de ${player.name}, ainda sem proposta formal.`,
      "positive",
    );
    addInbox(
      ctx.world,
      `market-approved-${item.id}`,
      "Diretoria",
      `Diretoria aprova interesse em ${player.name}`,
      `O contato foi autorizado por ${item.type.toLowerCase()}. A condução agora é da diretoria.`,
      ctx.state.currentRound,
    );
    return;
  }

  if (item.stage === "Contato inicial") {
    chooseRivals(ctx, item, player, seller, rng);
    maybeLeak(ctx, item, player, buyer, seller, rng);
    item.stage = "Negociação com clube";
    item.nextActionDate = addDays(ctx.state.currentDate, rng.integer(2, 5));
    const rivalNames = item.rivalClubIds
      .map((id) => ctx.league.clubs.find((club) => club.id === id)?.name)
      .filter(Boolean);
    log(
      item,
      ctx.state.currentDate,
      "Contato aberto",
      `${seller.name} foi procurado. ${rivalNames.length ? `${rivalNames.join(" e ")} também entrou/entraram na disputa.` : "O contato segue reservado."}`,
    );
    return;
  }

  if (item.stage === "Negociação com clube") {
    if (!isTransferWindowOpen(ctx.state.currentRound)) {
      if (!item.waitingForWindow) {
        log(item, ctx.state.currentDate, "Aguardando janela", "Os clubes mantêm contato, mas proposta formal e registro dependem da abertura da janela.");
        item.waitingForWindow = true;
      }
      item.nextActionDate = addDays(ctx.state.currentDate, 2);
      return;
    }
    item.waitingForWindow = false;
    const depth = seller.players.filter((candidate) => candidate.position === player.position).length;
    const base =
      item.type === "Compra"
        ? recommendedOffer(player)
        : Math.max(100_000, Math.round((recommendedOffer(player) * 0.06) / 50_000) * 50_000);
    const premium = item.rivalClubIds.length * 0.055 + (item.leaked ? 0.045 : 0) + (depth <= 2 ? 0.08 : 0);
    const fee = Math.round((base * (1 + premium + (item.negotiationRounds ?? 0) * 0.055)) / 50_000) * 50_000;
    item.agreedFeeEur = fee;
    if (fee > buyer.transferBudgetEur) {
      closeSaga(ctx, item, "Negociação interrompida", `${seller.name} elevou a pedida para ${formatEur(fee)} e a diretoria não encontrou margem.`);
      return;
    }
    const motivation = player.transferListed ? 18 : player.wantsToLeave ? 14 : 0;
    const acceptChance = Math.max(18, Math.min(92, 64 + motivation + (depth >= 4 ? 8 : depth <= 2 ? -18 : 0)));
    if (rng.integer(1, 100) > acceptChance) {
      if ((item.negotiationRounds ?? 0) < 1 && fee * 1.08 <= buyer.transferBudgetEur) {
        item.negotiationRounds = 1;
        item.nextActionDate = addDays(ctx.state.currentDate, rng.integer(1, 3));
        log(
          item,
          ctx.state.currentDate,
          "Contraproposta do clube",
          `${seller.name} rejeitou a primeira estrutura e pediu cerca de ${formatEur(Math.round((fee * 1.08) / 50_000) * 50_000)}.`,
          "negative",
        );
        return;
      }
      closeSaga(ctx, item, `${seller.name} encerra conversa`, `O clube vendedor não aceitou os parâmetros por ${player.name}.`);
      return;
    }
    const offer: TransferOffer = {
      id: nextId(ctx.market, "offer"),
      type: item.type,
      buyerClubId: buyer.id,
      sellerClubId: seller.id,
      playerId: player.id,
      feeEur: fee,
      salaryBrlMonthly: item.salaryBrlMonthly ?? Math.round((player.contract.salaryBrlMonthly * 1.12) / 5_000) * 5_000,
      createdRound: ctx.state.currentRound,
      expiresRound: ctx.state.currentRound + 2,
      status: "Aceita",
      message: `${seller.name} aceitou a proposta conduzida pela diretoria.`,
    };
    ctx.market.offers.unshift(offer);
    item.offerId = offer.id;
    item.sellerAccepted = true;
    item.stage = "Termos pessoais";
    item.nextActionDate = addDays(ctx.state.currentDate, rng.integer(1, 3));
    log(
      item,
      ctx.state.currentDate,
      "Acordo entre clubes",
      `${buyer.name} e ${seller.name} chegaram a um princípio de acordo por ${formatEur(fee)}. Agora o empresário negocia os termos pessoais.`,
      "positive",
    );
    addInbox(
      ctx.world,
      `market-club-agreement-${item.id}`,
      "Diretoria",
      `Acordo entre clubes por ${player.name}`,
      `Há princípio de acordo por ${formatEur(fee)}. Ainda faltam termos pessoais e documentação.`,
      ctx.state.currentRound,
    );
    return;
  }

  if (item.stage === "Termos pessoais") {
    const offer = ctx.market.offers.find((candidate) => candidate.id === item.offerId);
    if (!offer) {
      closeSaga(ctx, item, "Processo encerrado", "A proposta formal deixou de estar disponível.");
      return;
    }
    const rivals = item.rivalClubIds
      .map((id) => ctx.league.clubs.find((club) => club.id === id))
      .filter((club): club is LeagueClub => Boolean(club));
    const bestRival = [...rivals].sort((a, b) => b.reputation - a.reputation)[0];
    const prestige = (buyer.reputation - seller.reputation) * 1.35;
    const raise = (offer.salaryBrlMonthly / Math.max(1, player.contract.salaryBrlMonthly) - 1) * 100;
    const rivalPenalty = bestRival ? Math.max(5, (bestRival.reputation - buyer.reputation) * 1.6 + 8) : 0;
    const chance = Math.max(
      16,
      Math.min(94, 58 + prestige + raise + (player.wantsToLeave ? 14 : 0) + (player.personality === "Ambicioso" ? 7 : 0) - rivalPenalty),
    );
    if (rng.integer(1, 100) > chance) {
      offer.status = "Recusada";
      item.playerAccepted = false;
      if (bestRival && bestRival.transferBudgetEur >= (item.agreedFeeEur ?? item.estimatedFeeEur)) {
        const rivalFee = Math.min(
          bestRival.transferBudgetEur,
          Math.round(((item.agreedFeeEur ?? item.estimatedFeeEur) * 1.04) / 50_000) * 50_000,
        );
        const rivalOffer: TransferOffer = {
          id: nextId(ctx.market, "offer"),
          type: item.type,
          buyerClubId: bestRival.id,
          sellerClubId: seller.id,
          playerId: player.id,
          feeEur: rivalFee,
          salaryBrlMonthly: Math.round((player.contract.salaryBrlMonthly * 1.16) / 5_000) * 5_000,
          createdRound: ctx.state.currentRound,
          expiresRound: ctx.state.currentRound + 1,
          status: "Aceita",
          message: "Concorrente venceu a disputa.",
          personalTermsAgreed: true,
        };
        const rivalResult = completeOffer(ctx.state, ctx.league, ctx.market, rivalOffer, true);
        if (rivalResult.ok) {
          ctx.lineupIds = rivalResult.lineupIds;
          ctx.benchIds = rivalResult.benchIds;
          item.stage = "Encerrada";
          log(item, ctx.state.currentDate, "Concorrente vence disputa", `${player.name} preferiu o projeto do ${bestRival.name}.`, "negative");
          addNews(
            ctx.world,
            `market-rival-win-${item.id}`,
            `${bestRival.name} vence disputa por ${player.name}`,
            `${buyer.name} também negociava com o atleta, mas o concorrente fechou a operação por ${formatEur(rivalFee)}.`,
            ctx.state.currentRound,
            "negative",
          );
          addInbox(
            ctx.world,
            `market-rival-inbox-${item.id}`,
            "Diretoria",
            `${buyer.name} perde disputa por ${player.name}`,
            `O estafe escolheu o projeto do ${bestRival.name}. A diretoria encerrou a operação.`,
            ctx.state.currentRound,
          );
          return;
        }
      }
      closeSaga(ctx, item, `${player.name} recusa projeto`, `O jogador e seu empresário não chegaram a acordo com o ${buyer.name}.`, "neutral");
      return;
    }
    item.playerAccepted = true;
    offer.personalTermsAgreed = true;
    item.stage = "Documentação";
    item.documentationDays = rng.integer(2, 4);
    item.nextActionDate = addDays(ctx.state.currentDate, item.documentationDays);
    log(
      item,
      ctx.state.currentDate,
      "Termos pessoais acertados",
      `${player.name} aceitou o projeto. Exames, minutas e registro devem levar cerca de ${item.documentationDays} dia(s).`,
      "positive",
    );
    addInbox(
      ctx.world,
      `market-personal-${item.id}`,
      "Empresário",
      `${player.name} aceita projeto`,
      "O estafe aceitou os termos. O jogador ainda não pertence ao clube: faltam exames e documentação.",
      ctx.state.currentRound,
    );
  }
}

function processIncomingSaga(ctx: MarketContext, item: TransferNegotiation, player: LeaguePlayer, seller: LeagueClub, buyer: LeagueClub, rng: SeededRng) {
  const offer = ctx.market.offers.find((candidate) => candidate.id === item.offerId);
  if (!offer) {
    closeSaga(ctx, item, "Proposta retirada", "A proposta deixou de estar disponível.");
    return;
  }
  if (item.stage === "Análise da diretoria") {
    reviewIncomingBoard(ctx, item, offer, player, seller, buyer);
    return;
  }
  if (item.stage === "Termos pessoais") {
    const prestige = (buyer.reputation - seller.reputation) * 1.4;
    const raise = (offer.salaryBrlMonthly / Math.max(1, player.contract.salaryBrlMonthly) - 1) * 100;
    const mood = (player.wantsToLeave ? 18 : 0) + (player.happiness < 55 ? 10 : 0);
    const chance = Math.max(
      18,
      Math.min(95, 56 + prestige + raise + mood + (player.personality === "Ambicioso" ? 8 : player.personality === "Leal" ? -5 : 0)),
    );
    if (rng.integer(1, 100) > chance) {
      offer.status = "Recusada";
      offer.message = `${player.name} decidiu permanecer no ${seller.name}.`;
      item.playerAccepted = false;
      closeSaga(
        ctx,
        item,
        `${player.name} rejeita transferência`,
        `O atleta e seu empresário recusaram os termos do ${buyer.name}. O jogador permanece no elenco.`,
        "neutral",
      );
      addNews(
        ctx.world,
        `market-stay-${item.id}`,
        `${player.name} opta por permanecer no ${seller.name}`,
        `O jogador não chegou a acordo com o ${buyer.name} e a negociação foi encerrada.`,
        ctx.state.currentRound,
      );
      return;
    }
    item.playerAccepted = true;
    offer.personalTermsAgreed = true;
    item.stage = "Documentação";
    item.documentationDays = rng.integer(1, 3);
    item.nextActionDate = addDays(ctx.state.currentDate, item.documentationDays);
    log(item, ctx.state.currentDate, "Jogador aceita termos", `${player.name} deu sinal verde. Agora faltam exames, contratos e registro.`, "positive");
    addInbox(
      ctx.world,
      `market-player-accept-${item.id}`,
      "Empresário",
      `${player.name} aceita termos do ${buyer.name}`,
      `O jogador aceitou o projeto. A operação ainda levará aproximadamente ${item.documentationDays} dia(s) para ser registrada.`,
      ctx.state.currentRound,
    );
  }
}

function processDocumentation(ctx: MarketContext, item: TransferNegotiation, player: LeaguePlayer, seller: LeagueClub, buyer: LeagueClub, rng: SeededRng) {
  const offer = ctx.market.offers.find((candidate) => candidate.id === item.offerId);
  if (!offer) {
    closeSaga(ctx, item, "Documentação interrompida", "A proposta deixou de estar disponível antes do registro.");
    return;
  }
  if (!isTransferWindowOpen(ctx.state.currentRound)) {
    offer.status = "Expirada";
    closeSaga(ctx, item, "Prazo de registro perdido", "A documentação não ficou pronta antes do fechamento da janela.");
    return;
  }
  if ((item.paperworkDelayCount ?? 0) < 1 && rng.integer(1, 100) <= 12) {
    item.paperworkDelayCount = 1;
    const extraDays = rng.integer(1, 2);
    item.nextActionDate = addDays(ctx.state.currentDate, extraDays);
    log(item, ctx.state.currentDate, "Pendência documental", `Uma checagem de contrato/registro atrasou a conclusão em ${extraDays} dia(s).`, "negative");
    addInbox(
      ctx.world,
      `market-doc-delay-${item.id}`,
      "Diretoria",
      `Documentação de ${player.name} atrasou`,
      "O jurídico encontrou uma pendência de registro. O acordo continua válido, mas ainda não foi concluído.",
      ctx.state.currentRound,
    );
    return;
  }
  const result = completeOffer(ctx.state, ctx.league, ctx.market, offer, true);
  if (!result.ok) {
    closeSaga(ctx, item, "Registro não concluído", result.message);
    return;
  }
  ctx.lineupIds = result.lineupIds;
  ctx.benchIds = result.benchIds;
  item.stage = "Concluída";
  item.nextActionDate = ctx.state.currentDate;
  log(item, ctx.state.currentDate, "Transferência registrada", `${player.name} foi oficialmente registrado pelo ${buyer.name}.`, "positive");
  addNews(
    ctx.world,
    `market-done-${item.id}`,
    `${player.name} é anunciado pelo ${buyer.name}`,
    `${seller.name} e ${buyer.name} concluíram a operação por ${formatEur(offer.feeEur)} após acordo pessoal e documentação.`,
    ctx.state.currentRound,
    "positive",
  );
  addInbox(
    ctx.world,
    `market-done-inbox-${item.id}`,
    "Diretoria",
    `Transferência concluída: ${player.name}`,
    `${result.message} A operação foi registrada em ${dateLabel(ctx.state.currentDate)}.`,
    ctx.state.currentRound,
  );
}

function processSaga(ctx: MarketContext, item: TransferNegotiation) {
  if (!isActive(item) || item.nextActionDate > ctx.state.currentDate) return;
  const found = findPlayer(ctx.league, item.playerId);
  const buyer = ctx.league.clubs.find((club) => club.id === item.buyerClubId);
  const seller = ctx.league.clubs.find((club) => club.id === item.sellerClubId);
  if (!found || !buyer || !seller) {
    closeSaga(ctx, item, "Processo encerrado", "O jogador ou um dos clubes deixou de estar disponível.");
    return;
  }
  const rng = new SeededRng(`${ctx.state.baseSeed}:${item.id}:${ctx.state.currentDate}:${item.stage}`);
  if (item.stage === "Documentação") {
    processDocumentation(ctx, item, found.player, seller, buyer, rng);
    return;
  }
  if (item.direction === "Saída") {
    processIncomingSaga(ctx, item, found.player, seller, buyer, rng);
    return;
  }
  processOutgoingSaga(ctx, item, found.player, seller, buyer, rng);
}

function ensureIncomingSaga(ctx: MarketContext, offer: TransferOffer) {
  if (
    offer.sellerClubId !== ctx.state.selectedClubId ||
    offer.status !== "Pendente" ||
    negotiations(ctx.market).some((item) => item.offerId === offer.id)
  ) {
    return;
  }
  const found = findPlayer(ctx.league, offer.playerId);
  const buyer = ctx.league.clubs.find((club) => club.id === offer.buyerClubId);
  const seller = ctx.league.clubs.find((club) => club.id === offer.sellerClubId);
  if (!found || !buyer || !seller) return;
  const rng = new SeededRng(`${ctx.state.baseSeed}:${offer.id}:incoming-start`);
  const item: TransferNegotiation = {
    id: nextId(ctx.market, "neg"),
    direction: "Saída",
    type: offer.type,
    playerId: offer.playerId,
    playerName: found.player.name,
    buyerClubId: offer.buyerClubId,
    sellerClubId: offer.sellerClubId,
    createdDate: ctx.state.currentDate,
    stage: "Análise da diretoria",
    nextActionDate: addDays(ctx.state.currentDate, rng.integer(1, 2)),
    estimatedFeeEur: offer.feeEur,
    agreedFeeEur: offer.feeEur,
    salaryBrlMonthly: offer.salaryBrlMonthly,
    rivalClubIds: [],
    leaked: false,
    offerId: offer.id,
    timeline: [],
  };
  log(
    item,
    ctx.state.currentDate,
    "Proposta recebida",
    `${buyer.name} formalizou ${offer.type.toLowerCase()} por ${found.player.name}, em ${formatEur(offer.feeEur)}. A diretoria fará a análise sem intervenção do treinador.`,
  );
  negotiations(ctx.market).unshift(item);
  addNews(
    ctx.world,
    `market-incoming-news-${offer.id}`,
    `${buyer.name} faz proposta por ${found.player.name}`,
    `${seller.name} recebeu uma investida de ${formatEur(offer.feeEur)}. A diretoria ainda vai decidir se abre negociação.`,
    ctx.state.currentRound,
  );
  addInbox(
    ctx.world,
    `market-incoming-${offer.id}`,
    "Diretoria",
    `Proposta recebida por ${found.player.name}`,
    `${buyer.name} apresentou ${formatEur(offer.feeEur)}. Diretoria e jogador tomarão as decisões nos próximos dias e você receberá as atualizações como informativo.`,
    ctx.state.currentRound,
  );
}

function generateIncomingOffer(ctx: MarketContext, rng: SeededRng) {
  const user = ctx.league.clubs.find((club) => club.id === ctx.state.selectedClubId)!;
  const activePlayers = new Set(negotiations(ctx.market).filter(isActive).map((item) => item.playerId));
  const candidates = user.players.filter(
    (player) =>
      canMoveInsideSerieA(player) &&
      !activePlayers.has(player.id) &&
      !ctx.market.offers.some((offer) => offer.playerId === player.id && offer.status === "Pendente"),
  );
  if (!candidates.length || rng.integer(1, 100) > 68) return;
  const ranked = [...candidates].sort(
    (a, b) =>
      (Number(b.transferListed) + Number(b.wantsToLeave)) * 100 -
      (Number(a.transferListed) + Number(a.wantsToLeave)) * 100 +
      estimatedPlayerValue(b) -
      estimatedPlayerValue(a),
  );
  const player = ranked[rng.integer(0, Math.min(5, ranked.length - 1))];
  const buyers = ctx.league.clubs.filter(
    (club) =>
      club.id !== user.id &&
      club.transferBudgetEur > estimatedPlayerValue(player) * 0.7 &&
      club.players.filter((candidate) => candidate.position === player.position).length < 5,
  );
  if (!buyers.length) return;
  const buyer = rng.pick(buyers);
  const multiplier = player.transferListed || player.wantsToLeave ? rng.integer(90, 108) : rng.integer(96, 122);
  const fee = Math.round((estimatedPlayerValue(player) * multiplier) / 100 / 100_000) * 100_000;
  const offer: TransferOffer = {
    id: nextId(ctx.market, "offer"),
    type: rng.integer(1, 100) <= 12 ? "Empréstimo" : "Compra",
    buyerClubId: buyer.id,
    sellerClubId: user.id,
    playerId: player.id,
    feeEur: fee,
    salaryBrlMonthly: Math.round((player.contract.salaryBrlMonthly * 1.12) / 5_000) * 5_000,
    createdRound: ctx.state.currentRound,
    expiresRound: ctx.state.currentRound + 2,
    status: "Pendente",
    message: `${buyer.name} enviou uma proposta por ${player.name}.`,
  };
  ctx.market.offers.unshift(offer);
  ensureIncomingSaga(ctx, offer);
}

function processSimpleAiTransfers(state: SeasonState, league: LeagueWorld, market: MarketState, rng: SeededRng) {
  const locked = new Set(negotiations(market).filter(isActive).map((item) => item.playerId));
  const userId = state.selectedClubId;
  const buyers = league.clubs.filter((club) => club.id !== userId);
  let deals = 0;
  const maxDeals = Math.max(1, Math.min(3, Math.ceil(league.clubs.length / 8)));
  for (const buyer of buyers) {
    if (deals >= maxDeals || rng.integer(1, 100) > 28) continue;
    const candidates = league.clubs
      .filter((seller) => seller.id !== buyer.id && seller.id !== userId)
      .flatMap((seller) =>
        seller.players
          .filter(
            (player) =>
              !locked.has(player.id) &&
              player.injuryDays <= 18 &&
              buyer.transferBudgetEur >= estimatedPlayerValue(player) * 0.9 &&
              seller.players.filter((candidate) => candidate.position === player.position).length >= 3,
          )
          .map((player) => ({ seller, player })),
      )
      .sort((a, b) => b.player.overall - a.player.overall);
    if (!candidates.length) continue;
    const target = candidates[rng.integer(0, Math.min(8, candidates.length - 1))];
    const fee = Math.round((estimatedPlayerValue(target.player) * rng.integer(92, 115)) / 100 / 100_000) * 100_000;
    if (fee > buyer.transferBudgetEur) continue;
    const index = target.seller.players.findIndex((player) => player.id === target.player.id);
    if (index < 0) continue;
    const player = target.seller.players.splice(index, 1)[0];
    buyer.players.push(player);
    buyer.transferBudgetEur -= fee;
    target.seller.transferBudgetEur += fee;
    player.contract = {
      ...player.contract,
      salaryBrlMonthly: Math.round((player.contract.salaryBrlMonthly * 1.1) / 5_000) * 5_000,
      startYear: state.year,
      endYear: state.year + 3,
    };
    player.transferListed = false;
    player.wantsToLeave = false;
    player.joinedClubYear = state.year;
    player.clubTrainedYears = 0;
    market.history.unshift({
      id: nextId(market, "deal"),
      playerId: player.id,
      playerName: player.name,
      fromClubId: target.seller.id,
      toClubId: buyer.id,
      type: "Compra",
      feeEur: fee,
      round: state.currentRound,
      year: state.year,
      reason: "Movimento de mercado da IA por necessidade de elenco.",
    });
    deals += 1;
  }
  market.history = market.history.slice(0, 220);
}

function reviewExpiringContractsByBoard(state: SeasonState) {
  if (state.currentRound !== 1 && state.currentRound !== 19) return state;
  let next = state;
  const club = next.league.clubs.find((item) => item.id === next.selectedClubId);
  if (!club) return next;
  const average = club.players.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, club.players.length);
  const ids = club.players
    .filter(
      (player) =>
        player.contract.endYear <= next.year + 1 &&
        !player.wantsToLeave &&
        (player.squadRole === "Titular" || player.overall >= average - 3 || player.age <= 23),
    )
    .map((player) => player.id);
  for (const id of ids) {
    const current = next.league.clubs.find((item) => item.id === next.selectedClubId)?.players.find((player) => player.id === id);
    if (!current || current.contract.endYear > next.year + 1) continue;
    next = renewPlayerContract(next, id, current.age >= 33 ? 1 : current.age >= 30 ? 2 : 3).state;
  }
  return next;
}

export function processMarketRound(state: SeasonState): SeasonState {
  const { league, market } = withCopies(state);
  const world = cloneWorld(state.livingWorld);
  const ctx: MarketContext = {
    state,
    league,
    market,
    world,
    lineupIds: [...(state.lineupIds ?? [])],
    benchIds: [...(state.benchIds ?? [])],
  };

  if (market.lastProcessedDate !== state.currentDate) {
    market.lastProcessedDate = state.currentDate;
    for (const offer of market.offers) ensureIncomingSaga(ctx, offer);
    for (const item of negotiations(market)) processSaga(ctx, item);
  }

  const alreadyProcessedRound = market.lastProcessedRound === state.currentRound;
  if (!alreadyProcessedRound) {
    market.lastProcessedRound = state.currentRound;
    const user = league.clubs.find((club) => club.id === state.selectedClubId)!;
    for (const player of user.players) {
      if ((player.happiness < 48 || player.managerTrust < 40) && player.squadRole !== "Promessa") player.wantsToLeave = true;
    }
    if (isTransferWindowOpen(state.currentRound)) {
      const rng = new SeededRng(`${state.baseSeed}:${state.year}:market-r${state.currentRound}`);
      generateIncomingOffer(ctx, rng);
      processSimpleAiTransfers(state, league, market, rng);
    }
  }

  market.negotiations = negotiations(market).slice(0, 120);
  let nextState: SeasonState = {
    ...state,
    league,
    market,
    livingWorld: world,
    lineupIds: ctx.lineupIds,
    benchIds: ctx.benchIds,
  };
  if (!alreadyProcessedRound) nextState = reviewExpiringContractsByBoard(nextState);
  return nextState;
}

export function prepareNextMarketSeason(
  state: SeasonState,
  nextYear: number,
  league: LeagueWorld,
): { league: LeagueWorld; market: MarketState } {
  const market = cloneMarket(state.market);
  market.lastProcessedRound = undefined;
  market.lastProcessedDate = undefined;
  market.negotiations = negotiations(market).filter((item) => !isActive(item)).slice(0, 80);
  const returns: { player: LeaguePlayer; from: LeagueClub; toId: string }[] = [];
  for (const club of league.clubs) {
    for (const player of club.players) {
      const loan = player as LeaguePlayer & { loanFromClubId?: string; loanReturnYear?: number };
      if (loan.loanFromClubId && loan.loanReturnYear && loan.loanReturnYear <= nextYear) {
        returns.push({ player, from: club, toId: loan.loanFromClubId });
      }
    }
  }
  for (const item of returns) {
    item.from.players = item.from.players.filter((player) => player.id !== item.player.id);
    const parent = league.clubs.find((club) => club.id === item.toId);
    if (parent) {
      const loan = item.player as LeaguePlayer & { loanFromClubId?: string; loanReturnYear?: number };
      delete loan.loanFromClubId;
      delete loan.loanReturnYear;
      parent.players.push(item.player);
    }
  }
  for (const club of league.clubs) {
    const keep: LeaguePlayer[] = [];
    for (const player of club.players) {
      if (player.contract.endYear < nextYear) market.freeAgents.push(player);
      else keep.push(player);
    }
    club.players = keep;
  }
  market.offers = market.offers.filter((offer) => offer.status === "Concluída").slice(0, 120);
  market.freeAgents = market.freeAgents.slice(0, 120);
  return { league, market };
}

export function signFreeAgent(state: SeasonState, playerId: string): MarketActionResult {
  const { league, market } = withCopies(state);
  const index = market.freeAgents.findIndex((player) => player.id === playerId);
  if (index < 0) return { state, message: "Agente livre não encontrado." };
  const player = market.freeAgents[index];
  const club = league.clubs.find((item) => item.id === state.selectedClubId)!;
  const salary = Math.round(Math.max(player.contract.salaryBrlMonthly, estimatedPlayerValue(player) * 0.03) / 5_000) * 5_000;
  if (clubWageSpend(club) + salary > club.wageBudgetBrlMonthly) {
    return { state, message: `O teto salarial não comporta a pedida de ${formatBrl(salary)}/mês.` };
  }
  market.freeAgents.splice(index, 1);
  player.contract = { ...player.contract, salaryBrlMonthly: salary, startYear: state.year, endYear: state.year + 2 };
  player.happiness = 72;
  player.managerTrust = 60;
  player.wantsToLeave = false;
  club.players.push(player);
  const socialNote = applyArrivalImpact(club, player.id);
  market.history.unshift({
    id: nextId(market, "deal"),
    playerName: player.name,
    fromClubId: "free-agent",
    toClubId: club.id,
    type: "Compra",
    feeEur: 0,
    round: state.currentRound,
    year: state.year,
  });
  return { state: { ...state, league, market }, message: `${player.name} assinou como agente livre até ${state.year + 2}. ${socialNote}` };
}

export function formatEur(value: number) {
  return value >= 1_000_000
    ? `€ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`
    : `€ ${Math.round(value / 1_000).toLocaleString("pt-BR")} mil`;
}
export function formatBrl(value: number) {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}
