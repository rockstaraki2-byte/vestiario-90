import type { LeaguePlayer } from "./league";
import type { Formation } from "./match";
import { formationSlots, type TacticalSlot } from "./tactics-layout";

export type SquadSelectionMode = "best" | "moment" | "rotation" | "reserves" | "mixed" | "youth";

export type SquadSelectionAssignment = {
  slot: TacticalSlot;
  player: LeaguePlayer;
  score: number;
  positionFit: number;
};

export type SquadSelectionResult = {
  starters: LeaguePlayer[];
  bench: LeaguePlayer[];
  assignments: SquadSelectionAssignment[];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function positionFitForSlot(player: LeaguePlayer, slot: TacticalSlot) {
  const index = slot.preferred.indexOf(player.position);
  if (index === 0) return 100;
  if (index === 1) return 78;
  if (index === 2) return 56;
  if (index === 3) return 36;
  return player.position === "GOL" || slot.label === "GOL" ? 0 : 12;
}

function currentMoment(player: LeaguePlayer) {
  const form = clamp((player.form ?? 5) * 10);
  const lastRating = player.lastRating ? clamp((player.lastRating - 5) * 25) : 50;
  const averageRating = player.averageRating ? clamp((player.averageRating - 5) * 25) : 50;
  return form * 0.42 + lastRating * 0.34 + averageRating * 0.24;
}

function availabilityScore(player: LeaguePlayer) {
  return clamp(player.condition) * 0.85 - clamp(player.fatigue) * 0.65;
}

function roleBonus(player: LeaguePlayer, mode: SquadSelectionMode) {
  const role = player.squadRole;
  if (mode === "rotation" || mode === "reserves") {
    if (role === "Reserva") return 42;
    if (role === "Rotação") return 34;
    if (role === "Promessa") return 30;
    if (role === "Titular") return -18;
    if (role === "Líder") return -24;
  }
  if (mode === "mixed") {
    if (role === "Rotação" || role === "Reserva") return 16;
    if (role === "Promessa") return 14;
  }
  return 0;
}

function youthBonus(player: LeaguePlayer, mode: SquadSelectionMode) {
  if (mode === "youth") {
    if (player.age <= 20) return 150 + player.potential * 1.3;
    if (player.age <= 23) return 90 + player.potential * 0.9;
    return -35;
  }
  if (mode === "mixed") {
    if (player.age <= 21) return 18 + Math.max(0, player.potential - player.overall) * 1.2;
    if (player.age <= 23) return 10;
  }
  return 0;
}

export function squadSelectionScore(player: LeaguePlayer, slot: TacticalSlot, mode: SquadSelectionMode) {
  const fit = positionFitForSlot(player, slot);
  const moment = currentMoment(player);
  const physical = availabilityScore(player);
  const quality = player.overall;
  let footballScore: number;

  switch (mode) {
    case "moment":
      footballScore = quality * 3.2 + moment * 1.65 + physical * 1.15 + player.morale * 0.15;
      break;
    case "rotation":
    case "reserves":
      footballScore = quality * 3.1 + moment * 0.75 + physical * 1.65 + roleBonus(player, mode);
      break;
    case "mixed":
      footballScore = quality * 3.7 + moment * 1.05 + physical * 1.15 + roleBonus(player, mode) + youthBonus(player, mode);
      break;
    case "youth":
      footballScore = quality * 2.35 + player.potential * 2.15 + moment * 0.65 + physical * 0.9 + youthBonus(player, mode);
      break;
    case "best":
    default:
      footballScore = quality * 4.7 + moment * 1.05 + physical * 1.05 + player.morale * 0.12;
      break;
  }

  // Encaixe tático domina a escolha. Improvisos só entram se não houver opção natural/compatível.
  const positionScore = fit >= 100 ? 1200 : fit >= 78 ? 820 : fit >= 56 ? 500 : fit >= 36 ? 230 : fit >= 12 ? 45 : -1600;
  return positionScore + footballScore;
}

function chooseForSlots(players: LeaguePlayer[], formation: Formation, mode: SquadSelectionMode) {
  const remaining = [...players];
  const assignments: SquadSelectionAssignment[] = [];
  for (const slot of formationSlots(formation)) {
    if (!remaining.length) break;
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const player = remaining[index];
      const score = squadSelectionScore(player, slot, mode);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) continue;
    const [player] = remaining.splice(bestIndex, 1);
    assignments.push({ slot, player, score: bestScore, positionFit: positionFitForSlot(player, slot) });
  }
  return { assignments, remaining };
}

function benchCategory(player: LeaguePlayer) {
  if (player.position === "GOL") return "GOL";
  if (["LD", "LE", "ZAG"].includes(player.position)) return "DEF";
  if (["VOL", "MC", "MEI"].includes(player.position)) return "MID";
  return "ATA";
}

function benchScore(player: LeaguePlayer, mode: SquadSelectionMode) {
  const fakeSlot: TacticalSlot = { id: "bench", label: player.position, x: 50, y: 50, preferred: [player.position] };
  return squadSelectionScore(player, fakeSlot, mode);
}

function chooseBench(players: LeaguePlayer[], count: number, mode: SquadSelectionMode) {
  if (count <= 0) return [];
  const pool = [...players];
  const chosen: LeaguePlayer[] = [];
  const take = (category: ReturnType<typeof benchCategory>) => {
    if (chosen.length >= count) return;
    const candidates = pool
      .filter((player) => benchCategory(player) === category && !chosen.some((item) => item.id === player.id))
      .sort((a, b) => benchScore(b, mode) - benchScore(a, mode));
    const player = candidates[0];
    if (player) chosen.push(player);
  };

  if (count >= 4) {
    take("GOL");
    take("DEF");
    take("MID");
    take("ATA");
  } else if (count >= 2) {
    take("GOL");
  }
  for (const player of pool.sort((a, b) => benchScore(b, mode) - benchScore(a, mode))) {
    if (chosen.length >= count) break;
    if (!chosen.some((item) => item.id === player.id)) chosen.push(player);
  }
  return chosen.slice(0, count);
}

export function selectSquadForFormation(
  players: LeaguePlayer[],
  formation: Formation,
  mode: SquadSelectionMode = "best",
  benchSize = 7,
): SquadSelectionResult {
  const available = players.filter((player) => player.injuryDays === 0 && player.suspensionMatches === 0);
  const { assignments, remaining } = chooseForSlots(available, formation, mode);
  const starters = assignments.map((assignment) => assignment.player);
  const bench = chooseBench(remaining, Math.max(0, Math.min(benchSize, available.length - starters.length)), mode);
  return { starters, bench, assignments };
}
