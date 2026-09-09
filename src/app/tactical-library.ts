import type { MatchTactic } from "@/game-engine/match";

export type TacticalScenario =
  | "Base"
  | "Ganhando"
  | "Perdendo"
  | "Expulsão"
  | "Segurar empate"
  | "Últimos minutos";

export type SavedTacticPlan = {
  id: string;
  name: string;
  scenario: TacticalScenario;
  tactic: MatchTactic;
  createdAt: number;
};

export const TACTICAL_SCENARIOS: TacticalScenario[] = [
  "Base",
  "Ganhando",
  "Perdendo",
  "Expulsão",
  "Segurar empate",
  "Últimos minutos",
];

export function tacticalLibraryKey(clubId: string) {
  return `v90:tactical-library:${clubId}`;
}

export function cloneTactic(tactic: MatchTactic): MatchTactic {
  return JSON.parse(JSON.stringify(tactic)) as MatchTactic;
}

export function loadTacticalPlans(clubId: string): SavedTacticPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(tacticalLibraryKey(clubId)) ?? "[]") as SavedTacticPlan[];
    return Array.isArray(value)
      ? value.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && item.tactic)
      : [];
  } catch {
    return [];
  }
}

export function persistTacticalPlans(clubId: string, plans: SavedTacticPlan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(tacticalLibraryKey(clubId), JSON.stringify(plans));
}

export function scenarioForMatch(context: {
  minute: number;
  goalsFor: number;
  goalsAgainst: number;
  userRedCards: number;
}): TacticalScenario {
  const { minute, goalsFor, goalsAgainst, userRedCards } = context;
  if (userRedCards > 0) return "Expulsão";
  if (minute >= 78 && goalsFor === goalsAgainst) return "Últimos minutos";
  if (goalsFor > goalsAgainst) return "Ganhando";
  if (goalsFor < goalsAgainst) return "Perdendo";
  if (minute >= 65) return "Segurar empate";
  return "Base";
}

export function suggestedTacticalPlan(plans: SavedTacticPlan[], context: {
  minute: number;
  goalsFor: number;
  goalsAgainst: number;
  userRedCards: number;
}) {
  if (!plans.length) return undefined;
  const scenario = scenarioForMatch(context);
  return plans.find(plan => plan.scenario === scenario)
    ?? (scenario !== "Base" ? plans.find(plan => plan.scenario === "Base") : undefined);
}
