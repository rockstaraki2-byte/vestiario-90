import { describe, expect, it } from "vitest";
import { createSeason } from "./season";
import { formationSlots } from "./tactics-layout";
import { positionFitForSlot, selectSquadForFormation, squadSelectionScore } from "./squad-selection";

describe("seleção automática por formação", () => {
  it("sempre prioriza goleiro de origem no slot de goleiro quando há um disponível", () => {
    const season = createSeason("formation-aware-gk");
    const club = season.league.clubs[0];
    const goalkeeper = club.players.find((player) => player.position === "GOL");
    const attacker = club.players.find((player) => player.position === "ATA");
    expect(goalkeeper).toBeDefined();
    expect(attacker).toBeDefined();
    goalkeeper!.overall = 55;
    attacker!.overall = 99;
    attacker!.form = 10;
    attacker!.condition = 100;

    const result = selectSquadForFormation(club.players, "4-3-3", "best", 7);
    const gk = result.assignments.find((assignment) => assignment.slot.label === "GOL");

    expect(gk?.player.position).toBe("GOL");
    expect(gk?.player.id).not.toBe(attacker!.id);
  });

  it("preenche a formação escolhida priorizando jogadores naturais ou compatíveis", () => {
    const season = createSeason("formation-aware-shape");
    const club = season.league.clubs[0];
    const result = selectSquadForFormation(club.players, "4-2-3-1", "best", 7);

    expect(result.starters).toHaveLength(11);
    expect(result.assignments).toHaveLength(11);
    expect(result.assignments.every((assignment) => positionFitForSlot(assignment.player, assignment.slot) >= 36)).toBe(true);
    expect(result.assignments.find((assignment) => assignment.slot.label === "GOL")?.player.position).toBe("GOL");
  });

  it("modo momento valoriza forma, nota recente e condição entre jogadores da mesma posição", () => {
    const season = createSeason("formation-aware-moment");
    const club = season.league.clubs[0];
    const pair = club.players.filter((player) => player.position === "ZAG").slice(0, 2);
    expect(pair).toHaveLength(2);
    const [stronger, inForm] = pair;
    stronger.overall = 82;
    stronger.form = 2;
    stronger.lastRating = 5.7;
    stronger.averageRating = 6;
    stronger.condition = 68;
    stronger.fatigue = 32;
    inForm.overall = 79;
    inForm.form = 9;
    inForm.lastRating = 8.2;
    inForm.averageRating = 7.8;
    inForm.condition = 96;
    inForm.fatigue = 5;
    const slot = formationSlots("4-3-3").find((item) => item.label === "ZAG")!;

    expect(squadSelectionScore(inForm, slot, "moment")).toBeGreaterThan(squadSelectionScore(stronger, slot, "moment"));
  });

  it("jovens promessas mantêm a estrutura tática, inclusive no gol", () => {
    const season = createSeason("formation-aware-youth");
    const club = season.league.clubs[0];
    const result = selectSquadForFormation(club.players, "4-4-2", "youth", 7);

    expect(result.starters).toHaveLength(11);
    expect(result.assignments.find((assignment) => assignment.slot.label === "GOL")?.player.position).toBe("GOL");
    expect(result.assignments.filter((assignment) => assignment.slot.label === "ATA")).toHaveLength(2);
  });

  it("monta banco com goleiro e cobertura das linhas quando há vagas", () => {
    const season = createSeason("formation-aware-bench");
    const club = season.league.clubs[0];
    const result = selectSquadForFormation(club.players, "4-3-3", "mixed", 7);

    expect(result.bench.length).toBeGreaterThanOrEqual(4);
    expect(result.bench.some((player) => player.position === "GOL")).toBe(true);
    expect(result.bench.some((player) => ["LD", "LE", "ZAG"].includes(player.position))).toBe(true);
    expect(result.bench.some((player) => ["VOL", "MC", "MEI"].includes(player.position))).toBe(true);
    expect(result.bench.some((player) => ["PD", "PE", "ATA"].includes(player.position))).toBe(true);
  });
});
