import { describe, expect, it } from "vitest";
import { resolveContinentalAccessPaths, type ContinentalAccessEntrant } from "./continental-access-paths";
import { qualificationClubKey } from "./next-season-qualification";

function entrant(name: string, country: string, phase: "main" | "preliminary", reputation = 75): ContinentalAccessEntrant {
  return {
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    country,
    reputation,
    reason: phase === "preliminary" ? "Rota preliminar" : "Vaga direta",
    provenance: { sourceSeason: 2026, sourceCompetitionId: "TEST", route: "league", phase },
  };
}

describe("continental access paths", () => {
  it("keeps the field size while resolving preliminary entrants with real clubs", () => {
    const fields = {
      UCL: [
        entrant("Arsenal", "Inglaterra", "main", 90),
        entrant("Barcelona", "Espanha", "preliminary", 91),
        entrant("Bayern München", "Alemanha", "main", 90),
      ],
    };
    const resolved = resolveContinentalAccessPaths(fields, 2027);
    expect(resolved.fields.UCL).toHaveLength(3);
    expect(resolved.paths[0].preliminary).toBe(1);
    expect(resolved.paths[0].ties).toHaveLength(1);
    expect(resolved.fields.UCL?.every(entry => entry.provenance?.phase === "main")).toBe(true);
  });

  it("is deterministic for the same season and inputs", () => {
    const fields = { UEL: [entrant("Roma", "Itália", "preliminary", 82)] };
    const first = resolveContinentalAccessPaths(fields, 2028);
    const second = resolveContinentalAccessPaths(fields, 2028);
    expect(second).toEqual(first);
  });

  it("does not allocate the same club across UEFA competitions", () => {
    const fields = {
      UCL: [entrant("Arsenal", "Inglaterra", "main", 90), entrant("Barcelona", "Espanha", "preliminary", 90)],
      UEL: [entrant("Roma", "Itália", "main", 82), entrant("Benfica", "Portugal", "preliminary", 81)],
      UECL: [entrant("Braga", "Portugal", "main", 78), entrant("Ajax", "Holanda", "preliminary", 79)],
    };
    const resolved = resolveContinentalAccessPaths(fields, 2029);
    const names = ["UCL", "UEL", "UECL"].flatMap(id => (resolved.fields[id as "UCL" | "UEL" | "UECL"] ?? []).map(entry => qualificationClubKey(entry.name)));
    expect(new Set(names).size).toBe(names.length);
  });

  it("records both legs and the aggregate result", () => {
    const resolved = resolveContinentalAccessPaths({ LIB: [entrant("Palmeiras", "Brasil", "preliminary", 86)] }, 2030);
    const tie = resolved.paths[0].ties[0];
    expect(tie.firstLeg.home).toBe("Palmeiras");
    expect(tie.secondLeg.away).toBe("Palmeiras");
    expect(tie.aggregate.projected).toBe(tie.firstLeg.homeGoals + tie.secondLeg.awayGoals);
    expect(tie.aggregate.opponent).toBe(tie.firstLeg.awayGoals + tie.secondLeg.homeGoals);
    expect([tie.projectedClub, tie.opponent]).toContain(tie.winner);
  });
});
