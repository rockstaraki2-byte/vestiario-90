import { describe, expect, it } from "vitest";
import {
  archiveQualificationEntries,
  associationCoefficientRanking,
  associationSeasonScores,
  qualificationProvenance,
  topPerformanceAssociations,
  updateAssociationHistory,
} from "./qualification-ecosystem";

describe("Sprint 10 • qualification ecosystem", () => {
  it("estrutura a procedência das vagas continentais", () => {
    expect(qualificationProvenance("Vice da Copa do Brasil • pré-Libertadores", 2026)).toMatchObject({
      sourceSeason: 2026,
      sourceCompetitionId: "CDB",
      route: "cup",
      phase: "preliminary",
      sourceChampion: false,
    });
    expect(qualificationProvenance("Campeão da Champions", 2026)).toMatchObject({
      sourceCompetitionId: "UCL",
      route: "titleholder",
      phase: "main",
      sourceChampion: true,
    });
    expect(qualificationProvenance("Classificação nacional • GER1", 2026)).toMatchObject({
      sourceCompetitionId: "GER1",
      route: "league",
    });
    expect(qualificationProvenance("Vaga extra por desempenho UEFA", 2026).route).toBe("performance");
  });

  it("arquiva motivo e origem de cada clube, sem perder os campos legados", () => {
    const archived = archiveQualificationEntries([
      { name: "Clube A", country: "Brasil", reason: "Brasileirão • vaga Libertadores" },
      { name: "Clube B", country: "Inglaterra", reason: "Campeão da Europa League" },
    ], 2026);
    expect(archived).toHaveLength(2);
    expect(archived[0]).toMatchObject({ name: "Clube A", country: "Brasil", reason: "Brasileirão • vaga Libertadores" });
    expect(archived[0].provenance.sourceCompetitionId).toBe("BRA1");
    expect(archived[1].provenance).toMatchObject({ sourceCompetitionId: "UEL", route: "titleholder" });
  });

  it("calcula coeficiente de associação por competição UEFA", () => {
    const scores = associationSeasonScores([
      { definition: { id: "UCL" }, matches: [
        { played: true, home: { country: "Inglaterra" }, away: { country: "Espanha" }, homeGoals: 2, awayGoals: 1 },
        { played: true, home: { country: "Itália" }, away: { country: "Inglaterra" }, homeGoals: 0, awayGoals: 0 },
      ] },
      { definition: { id: "UEL" }, matches: [
        { played: true, home: { country: "Espanha" }, away: { country: "Itália" }, homeGoals: 3, awayGoals: 1 },
      ] },
    ], 2026);
    const england = scores.find(item => item.country === "Inglaterra");
    const spain = scores.find(item => item.country === "Espanha");
    expect(england?.points).toBe(3);
    expect(england?.competitions.UCL).toBe(3);
    expect(spain?.points).toBe(2);
    expect(spain?.competitions.UEL).toBe(2);
  });

  it("mantém janela de cinco temporadas e ranqueia associações pelo acumulado", () => {
    let history = [];
    for (let season = 2025; season <= 2031; season++) {
      history = updateAssociationHistory(history, [
        { season, country: "Inglaterra", points: 12, competitions: { UCL: 12 } },
        { season, country: "Espanha", points: season % 2 ? 10 : 14, competitions: { UCL: season % 2 ? 10 : 14 } },
      ]);
    }
    expect(new Set(history.map(item => item.season))).toEqual(new Set([2031, 2030, 2029, 2028, 2027]));
    const ranking = associationCoefficientRanking(history);
    expect(ranking[0].rank).toBe(1);
    expect(ranking.every(item => item.seasons.length === 5)).toBe(true);
    expect(topPerformanceAssociations(history, 2)).toEqual(ranking.slice(0, 2).map(item => item.country));
  });
});
