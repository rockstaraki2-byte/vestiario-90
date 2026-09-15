import { PROFESSIONAL_COMPETITIONS } from "../data/brazil-2026/competitions";
import type { WorldCompetitionId } from "./world-competitions";
import { qualificationClubKey } from "./next-season-qualification";
import type { QualificationProvenance } from "./qualification-ecosystem";

export type ContinentalAccessCompetitionId = Extract<WorldCompetitionId, "LIB" | "SUD" | "UCL" | "UEL" | "UECL">;
export type ContinentalAccessEntrant = {
  name: string;
  shortName: string;
  country: string;
  reputation: number;
  reason: string;
  provenance?: QualificationProvenance;
};

export type ContinentalAccessTie = {
  competitionId: ContinentalAccessCompetitionId;
  season: number;
  projectedClub: string;
  opponent: string;
  winner: string;
  loser: string;
  firstLeg: { home: string; away: string; homeGoals: number; awayGoals: number };
  secondLeg: { home: string; away: string; homeGoals: number; awayGoals: number };
  aggregate: { projected: number; opponent: number };
  resolvedBy: "aggregate" | "penalties";
};

export type ContinentalAccessResolution = {
  competitionId: ContinentalAccessCompetitionId;
  direct: number;
  preliminary: number;
  replacements: number;
  ties: ContinentalAccessTie[];
};

export type ContinentalAccessResult = {
  fields: Partial<Record<WorldCompetitionId, ContinentalAccessEntrant[]>>;
  paths: ContinentalAccessResolution[];
};

const CONTINENTAL_IDS: ContinentalAccessCompetitionId[] = ["UCL", "UEL", "UECL", "LIB", "SUD"];
const EUROPE = new Set(["Inglaterra", "England", "Espanha", "Spain", "Alemanha", "Germany", "Itália", "Italia", "Italy", "França", "Franca", "France", "Portugal", "Holanda", "Países Baixos", "Paises Baixos", "Netherlands", "Bélgica", "Belgica", "Belgium", "Escócia", "Escocia", "Scotland", "Áustria", "Austria", "Suíça", "Suica", "Switzerland", "Turquia", "Turkey", "Grécia", "Grecia", "Greece", "Dinamarca", "Denmark", "Noruega", "Norway", "Suécia", "Suecia", "Sweden", "Polônia", "Polonia", "Poland", "República Tcheca", "Republica Tcheca", "Czech Republic", "Croácia", "Croacia", "Croatia"]);
const SOUTH_AMERICA = new Set(["Brasil", "Brazil", "Argentina", "Uruguai", "Uruguay", "Paraguai", "Paraguay", "Chile", "Colômbia", "Colombia", "Equador", "Ecuador", "Peru", "Bolívia", "Bolivia", "Venezuela"]);

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function goals(seed: string, homeRep: number, awayRep: number) {
  const base = hash(seed);
  const delta = Math.max(-18, Math.min(18, homeRep - awayRep));
  const home = Math.max(0, (base % 3) + (delta >= 8 ? 1 : 0));
  const away = Math.max(0, ((base >>> 3) % 3) + (delta <= -8 ? 1 : 0));
  return [home, away] as const;
}

function confederationCountries(id: ContinentalAccessCompetitionId) {
  return id === "LIB" || id === "SUD" ? SOUTH_AMERICA : EUROPE;
}

function reservePool(id: ContinentalAccessCompetitionId, blocked: Set<string>) {
  const countries = confederationCountries(id);
  const out: ContinentalAccessEntrant[] = [];
  const used = new Set<string>();
  for (const competition of PROFESSIONAL_COMPETITIONS) {
    if (!countries.has(competition.country)) continue;
    for (const club of competition.clubs) {
      const key = qualificationClubKey(club.name);
      if (blocked.has(key) || used.has(key)) continue;
      used.add(key);
      const reputation = club.marketValueEur >= 500_000_000 ? 91 : club.marketValueEur >= 250_000_000 ? 85 : club.marketValueEur >= 100_000_000 ? 78 : club.marketValueEur >= 40_000_000 ? 70 : 62;
      out.push({
        name: club.name,
        shortName: club.shortName,
        country: competition.country,
        reputation,
        reason: `Rota preliminar ${id}`,
        provenance: { sourceSeason: 0, sourceCompetitionId: competition.id, route: "continental-pool", phase: "preliminary" },
      });
    }
  }
  return out.sort((a, b) => b.reputation - a.reputation || a.name.localeCompare(b.name));
}

function resolveTie(id: ContinentalAccessCompetitionId, season: number, projected: ContinentalAccessEntrant, opponent: ContinentalAccessEntrant): { winner: ContinentalAccessEntrant; tie: ContinentalAccessTie } {
  const [h1, a1] = goals(`${season}:${id}:${projected.name}:${opponent.name}:1`, projected.reputation, opponent.reputation);
  const [h2, a2] = goals(`${season}:${id}:${projected.name}:${opponent.name}:2`, opponent.reputation, projected.reputation);
  const projectedAggregate = h1 + a2;
  const opponentAggregate = a1 + h2;
  let winner = projectedAggregate > opponentAggregate ? projected : opponentAggregate > projectedAggregate ? opponent : undefined;
  let resolvedBy: "aggregate" | "penalties" = "aggregate";
  if (!winner) {
    resolvedBy = "penalties";
    winner = hash(`${season}:${id}:${projected.name}:${opponent.name}:pens`) % 2 === 0 ? projected : opponent;
  }
  const loser = winner === projected ? opponent : projected;
  return {
    winner,
    tie: {
      competitionId: id,
      season,
      projectedClub: projected.name,
      opponent: opponent.name,
      winner: winner.name,
      loser: loser.name,
      firstLeg: { home: projected.name, away: opponent.name, homeGoals: h1, awayGoals: a1 },
      secondLeg: { home: opponent.name, away: projected.name, homeGoals: h2, awayGoals: a2 },
      aggregate: { projected: projectedAggregate, opponent: opponentAggregate },
      resolvedBy,
    },
  };
}

function copyEntrant(entry: ContinentalAccessEntrant): ContinentalAccessEntrant {
  return { ...entry, provenance: entry.provenance ? { ...entry.provenance } : undefined };
}

export function resolveContinentalAccessPaths(
  fields: Partial<Record<WorldCompetitionId, ContinentalAccessEntrant[]>>,
  season: number,
): ContinentalAccessResult {
  const result: Partial<Record<WorldCompetitionId, ContinentalAccessEntrant[]>> = { ...fields };
  const paths: ContinentalAccessResolution[] = [];
  const globalBlocked = new Set<string>();
  const initialBlocked = new Set(CONTINENTAL_IDS.flatMap(id => (fields[id] ?? []).map(entry => qualificationClubKey(entry.name))));

  for (const id of CONTINENTAL_IDS) {
    const source = (fields[id] ?? []).map(copyEntrant);
    if (!source.length) continue;

    const reserveBlocked = new Set([...initialBlocked, ...globalBlocked]);
    const reserves = reservePool(id, reserveBlocked);
    const resolved: ContinentalAccessEntrant[] = [];
    const ties: ContinentalAccessTie[] = [];
    let reserveIndex = 0;
    let replacements = 0;

    for (const entry of source) {
      if (entry.provenance?.phase !== "preliminary") {
        resolved.push(entry);
        continue;
      }
      const opponent = reserves[reserveIndex++];
      if (!opponent) throw new Error(`${id}: no real club available for preliminary route`);
      opponent.provenance = { ...(opponent.provenance ?? { sourceSeason: season, route: "continental-pool", phase: "preliminary" }), sourceSeason: season };
      const outcome = resolveTie(id, season, entry, opponent);
      ties.push(outcome.tie);
      if (outcome.winner !== entry) replacements++;
      resolved.push({
        ...outcome.winner,
        reason: outcome.winner === entry ? entry.reason : `Venceu rota preliminar contra ${entry.name}`,
        provenance: {
          ...(outcome.winner.provenance ?? entry.provenance ?? { sourceSeason: season, route: "continental-pool", phase: "preliminary" }),
          sourceSeason: season,
          phase: "main",
        },
      });
    }

    const local = new Set<string>();
    for (const entry of resolved) {
      const key = qualificationClubKey(entry.name);
      if (local.has(key)) throw new Error(`${id}: duplicate club after access resolution: ${entry.name}`);
      if (globalBlocked.has(key)) throw new Error(`${id}: club already allocated to another continental competition: ${entry.name}`);
      local.add(key);
      globalBlocked.add(key);
    }

    result[id] = resolved;
    paths.push({
      competitionId: id,
      direct: source.filter(entry => entry.provenance?.phase !== "preliminary").length,
      preliminary: ties.length,
      replacements,
      ties,
    });
  }

  return { fields: result, paths };
}
