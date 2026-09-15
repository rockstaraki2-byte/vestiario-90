import type { WorldCompetitionId } from "./world-competitions";

export type ContinentalCompetitionId = Extract<WorldCompetitionId, "LIB" | "SUD" | "UCL" | "UEL" | "UECL">;
export type UefaCompetitionId = Extract<ContinentalCompetitionId, "UCL" | "UEL" | "UECL">;
export type QualificationRoute = "league" | "cup" | "titleholder" | "performance" | "continental-pool";
export type QualificationPhase = "main" | "preliminary";

export type QualificationProvenance = {
  sourceSeason: number;
  sourceCompetitionId?: string;
  route: QualificationRoute;
  phase: QualificationPhase;
  sourcePosition?: number;
  sourceChampion?: boolean;
};

export type ArchivedQualificationEntry = {
  name: string;
  country: string;
  reason: string;
  provenance: QualificationProvenance;
};

export type AssociationCoefficientSeason = {
  season: number;
  country: string;
  points: number;
  competitions: Partial<Record<UefaCompetitionId, number>>;
};

export type AssociationCoefficientRank = {
  country: string;
  points: number;
  rank: number;
  seasons: Array<{ season: number; points: number }>;
};

type QualificationLike = {
  name: string;
  country: string;
  reason: string;
  provenance?: QualificationProvenance;
};

type MatchParticipant = { country: string };
type UefaMatchLike = {
  played: boolean;
  home: MatchParticipant;
  away: MatchParticipant;
  homeGoals?: number;
  awayGoals?: number;
};
type UefaTournamentLike = {
  definition: { id: WorldCompetitionId };
  matches: UefaMatchLike[];
};

const UEFA_IDS: UefaCompetitionId[] = ["UCL", "UEL", "UECL"];

function normalizeReason(reason: string) {
  return reason.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sourceCompetitionFromReason(reason: string): string | undefined {
  const text = normalizeReason(reason);
  const explicit = text.match(/\b(eng1|esp1|ger1|ita1|fra1|por1|bra1)\b/i)?.[1]?.toUpperCase();
  if (explicit) return explicit;
  if (text.includes("copa do brasil")) return "CDB";
  if (text.includes("copa da liga")) return "EFL";
  if (text.includes("champions")) return "UCL";
  if (text.includes("europa league")) return "UEL";
  if (text.includes("brasileirao")) return "BRA1";
  return undefined;
}

function routeFromReason(reason: string): QualificationRoute {
  const text = normalizeReason(reason);
  if (text.includes("campeao continental") || text.includes("campeao da champions") || text.includes("campeao da europa league")) return "titleholder";
  if (text.includes("copa do brasil") || text.includes("copa nacional") || text.includes("copa da liga")) return "cup";
  if (text.includes("desempenho uefa")) return "performance";
  if (text.includes("coeficiente") || text.includes("rota continental")) return "continental-pool";
  return "league";
}

function phaseFromReason(reason: string): QualificationPhase {
  const text = normalizeReason(reason);
  return text.includes("pre-") || text.includes("pre ") || text.includes("preliminar") ? "preliminary" : "main";
}

function sourcePositionFromReason(reason: string): number | undefined {
  const match = reason.match(/\b(\d{1,2})\s*[ºoªa]?\s*(?:lugar|colocado|posição|posicao)\b/i);
  return match ? Number(match[1]) : undefined;
}

export function qualificationProvenance(reason: string, sourceSeason: number): QualificationProvenance {
  const route = routeFromReason(reason);
  return {
    sourceSeason,
    sourceCompetitionId: sourceCompetitionFromReason(reason),
    route,
    phase: phaseFromReason(reason),
    sourcePosition: sourcePositionFromReason(reason),
    sourceChampion: route === "titleholder" || (route === "cup" && normalizeReason(reason).includes("campeao")),
  };
}

export function enrichQualificationEntries<T extends QualificationLike>(entries: T[], sourceSeason: number): Array<T & { provenance: QualificationProvenance }> {
  return entries.map(entry => ({
    ...entry,
    provenance: entry.provenance ?? qualificationProvenance(entry.reason, sourceSeason),
  }));
}

export function archiveQualificationEntries(entries: QualificationLike[], sourceSeason: number): ArchivedQualificationEntry[] {
  return enrichQualificationEntries(entries, sourceSeason).map(entry => ({
    name: entry.name,
    country: entry.country,
    reason: entry.reason,
    provenance: entry.provenance,
  }));
}

export function associationSeasonScores(tournaments: UefaTournamentLike[], season: number): AssociationCoefficientSeason[] {
  const scores = new Map<string, { points: number; competitions: Partial<Record<UefaCompetitionId, number>> }>();
  for (const tournament of tournaments) {
    if (!UEFA_IDS.includes(tournament.definition.id as UefaCompetitionId)) continue;
    const competitionId = tournament.definition.id as UefaCompetitionId;
    for (const match of tournament.matches.filter(item => item.played)) {
      const hg = match.homeGoals ?? 0;
      const ag = match.awayGoals ?? 0;
      const homePoints = hg > ag ? 2 : hg === ag ? 1 : 0;
      const awayPoints = ag > hg ? 2 : hg === ag ? 1 : 0;
      for (const [country, points] of [[match.home.country, homePoints], [match.away.country, awayPoints]] as const) {
        const current = scores.get(country) ?? { points: 0, competitions: {} };
        current.points += points;
        current.competitions[competitionId] = (current.competitions[competitionId] ?? 0) + points;
        scores.set(country, current);
      }
    }
  }
  return [...scores.entries()].map(([country, value]) => ({
    season,
    country,
    points: value.points,
    competitions: value.competitions,
  })).sort((a, b) => b.points - a.points || a.country.localeCompare(b.country));
}

export function updateAssociationHistory(
  current: AssociationCoefficientSeason[] | undefined,
  seasonScores: AssociationCoefficientSeason[],
  keepSeasons = 5,
): AssociationCoefficientSeason[] {
  const merged = [...(current ?? []).filter(item => item.season !== seasonScores[0]?.season), ...seasonScores];
  const seasons = [...new Set(merged.map(item => item.season))].sort((a, b) => b - a).slice(0, keepSeasons);
  const allowed = new Set(seasons);
  return merged.filter(item => allowed.has(item.season)).sort((a, b) => b.season - a.season || b.points - a.points || a.country.localeCompare(b.country));
}

export function associationCoefficientRanking(history: AssociationCoefficientSeason[] | undefined): AssociationCoefficientRank[] {
  const byCountry = new Map<string, AssociationCoefficientRank>();
  for (const item of history ?? []) {
    const current = byCountry.get(item.country) ?? { country: item.country, points: 0, rank: 0, seasons: [] };
    current.points += item.points;
    current.seasons.push({ season: item.season, points: item.points });
    byCountry.set(item.country, current);
  }
  return [...byCountry.values()]
    .map(item => ({ ...item, seasons: item.seasons.sort((a, b) => b.season - a.season) }))
    .sort((a, b) => b.points - a.points || a.country.localeCompare(b.country))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function topPerformanceAssociations(history: AssociationCoefficientSeason[] | undefined, count = 2): string[] {
  return associationCoefficientRanking(history).slice(0, count).map(item => item.country);
}
