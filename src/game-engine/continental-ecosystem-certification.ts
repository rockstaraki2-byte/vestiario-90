import { qualificationClubKey } from "./next-season-qualification";
import type { AssociationCoefficientSeason, QualificationProvenance } from "./qualification-ecosystem";
import type { WorldCompetitionId } from "./world-competitions";

export type ContinentalCompetitionId = Extract<WorldCompetitionId, "LIB" | "SUD" | "UCL" | "UEL" | "UECL">;
export type ContinentalCertificationStatus = "certified" | "warning" | "blocked";
export type ContinentalCertificationSeverity = "warning" | "blocked";
export type ContinentalCertificationIssueCode =
  | "FIELD_SIZE"
  | "DUPLICATE_IN_FIELD"
  | "CROSS_COMPETITION_DUPLICATE"
  | "SYNTHETIC_CLUB"
  | "MISSING_PROVENANCE"
  | "PROVENANCE_SEASON_MISMATCH"
  | "COEFFICIENT_DUPLICATE"
  | "COEFFICIENT_INVALID"
  | "COEFFICIENT_WINDOW";

export type ContinentalCertificationIssue = {
  code: ContinentalCertificationIssueCode;
  severity: ContinentalCertificationSeverity;
  competitionId?: ContinentalCompetitionId;
  clubName?: string;
  country?: string;
  message: string;
};

export type ContinentalQualificationEntry = {
  name: string;
  country: string;
  reason?: string;
  provenance?: QualificationProvenance;
};

export type ContinentalEcosystemCertification = {
  status: ContinentalCertificationStatus;
  sourceSeason: number;
  checkedCompetitions: ContinentalCompetitionId[];
  expectedParticipants: number;
  actualParticipants: number;
  associationSeasons: number[];
  issues: ContinentalCertificationIssue[];
};

export type ContinentalCertificationInput = {
  fields: Partial<Record<WorldCompetitionId, ContinentalQualificationEntry[]>>;
  associationHistory?: AssociationCoefficientSeason[];
  sourceSeason: number;
};

export const CONTINENTAL_FIELD_SIZE: Record<ContinentalCompetitionId, number> = {
  LIB: 32,
  SUD: 32,
  UCL: 36,
  UEL: 36,
  UECL: 36,
};

const CONTINENTAL_IDS = Object.keys(CONTINENTAL_FIELD_SIZE) as ContinentalCompetitionId[];
const SYNTHETIC_PATTERN = /(?:^|\b)(?:classificado|virtual|placeholder|fict[ií]cio|synthetic)(?:\b|[-_:])/i;

function issue(
  issues: ContinentalCertificationIssue[],
  code: ContinentalCertificationIssueCode,
  severity: ContinentalCertificationSeverity,
  message: string,
  meta: Partial<Pick<ContinentalCertificationIssue, "competitionId" | "clubName" | "country">> = {},
) {
  issues.push({ code, severity, message, ...meta });
}

function auditField(
  competitionId: ContinentalCompetitionId,
  entries: ContinentalQualificationEntry[],
  sourceSeason: number,
  issues: ContinentalCertificationIssue[],
) {
  const expected = CONTINENTAL_FIELD_SIZE[competitionId];
  if (entries.length !== expected) {
    issue(issues, "FIELD_SIZE", "blocked", `${competitionId}: campo ${entries.length}/${expected}.`, { competitionId });
  }

  const seen = new Map<string, string>();
  for (const entry of entries) {
    const key = qualificationClubKey(entry.name);
    const previous = seen.get(key);
    if (previous) {
      issue(issues, "DUPLICATE_IN_FIELD", "blocked", `${competitionId}: clube duplicado (${previous} / ${entry.name}).`, {
        competitionId,
        clubName: entry.name,
      });
    } else {
      seen.set(key, entry.name);
    }

    if (SYNTHETIC_PATTERN.test(entry.name)) {
      issue(issues, "SYNTHETIC_CLUB", "blocked", `${competitionId}: participante sintético detectado (${entry.name}).`, {
        competitionId,
        clubName: entry.name,
      });
    }

    if (!entry.provenance) {
      issue(issues, "MISSING_PROVENANCE", "warning", `${competitionId}: ${entry.name} está sem procedência estruturada.`, {
        competitionId,
        clubName: entry.name,
      });
    } else if (entry.provenance.sourceSeason !== sourceSeason) {
      issue(
        issues,
        "PROVENANCE_SEASON_MISMATCH",
        "warning",
        `${competitionId}: ${entry.name} aponta para a temporada ${entry.provenance.sourceSeason}, esperado ${sourceSeason}.`,
        { competitionId, clubName: entry.name },
      );
    }
  }
}

function auditCrossCompetition(
  fields: Partial<Record<WorldCompetitionId, ContinentalQualificationEntry[]>>,
  ids: ContinentalCompetitionId[],
  issues: ContinentalCertificationIssue[],
) {
  const owner = new Map<string, { competitionId: ContinentalCompetitionId; name: string }>();
  for (const competitionId of ids) {
    for (const entry of fields[competitionId] ?? []) {
      const key = qualificationClubKey(entry.name);
      const previous = owner.get(key);
      if (previous && previous.competitionId !== competitionId) {
        issue(
          issues,
          "CROSS_COMPETITION_DUPLICATE",
          "blocked",
          `${entry.name} aparece em ${previous.competitionId} e ${competitionId} na mesma edição.`,
          { competitionId, clubName: entry.name },
        );
      } else {
        owner.set(key, { competitionId, name: entry.name });
      }
    }
  }
}

function auditAssociationHistory(history: AssociationCoefficientSeason[], issues: ContinentalCertificationIssue[]) {
  const seasons = [...new Set(history.map(item => item.season))].sort((a, b) => b - a);
  if (seasons.length > 5) {
    issue(issues, "COEFFICIENT_WINDOW", "blocked", `Coeficientes de associação mantêm ${seasons.length} temporadas; máximo esperado: 5.`);
  }

  const seen = new Set<string>();
  for (const item of history) {
    const key = `${item.season}:${item.country}`;
    if (seen.has(key)) {
      issue(issues, "COEFFICIENT_DUPLICATE", "blocked", `Coeficiente duplicado para ${item.country} em ${item.season}.`, { country: item.country });
    }
    seen.add(key);
    if (!Number.isFinite(item.points) || item.points < 0) {
      issue(issues, "COEFFICIENT_INVALID", "blocked", `Coeficiente inválido para ${item.country} em ${item.season}: ${item.points}.`, { country: item.country });
    }
    for (const value of Object.values(item.competitions ?? {})) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        issue(issues, "COEFFICIENT_INVALID", "blocked", `Parcial de coeficiente inválido para ${item.country} em ${item.season}.`, { country: item.country });
      }
    }
  }
  return seasons;
}

export function certifyContinentalEcosystem(input: ContinentalCertificationInput): ContinentalEcosystemCertification {
  const issues: ContinentalCertificationIssue[] = [];
  for (const competitionId of CONTINENTAL_IDS) {
    auditField(competitionId, input.fields[competitionId] ?? [], input.sourceSeason, issues);
  }
  auditCrossCompetition(input.fields, ["LIB", "SUD"], issues);
  auditCrossCompetition(input.fields, ["UCL", "UEL", "UECL"], issues);
  const associationSeasons = auditAssociationHistory(input.associationHistory ?? [], issues);
  const blocked = issues.some(item => item.severity === "blocked");
  const warning = issues.some(item => item.severity === "warning");
  return {
    status: blocked ? "blocked" : warning ? "warning" : "certified",
    sourceSeason: input.sourceSeason,
    checkedCompetitions: CONTINENTAL_IDS,
    expectedParticipants: CONTINENTAL_IDS.reduce((sum, id) => sum + CONTINENTAL_FIELD_SIZE[id], 0),
    actualParticipants: CONTINENTAL_IDS.reduce((sum, id) => sum + (input.fields[id]?.length ?? 0), 0),
    associationSeasons,
    issues,
  };
}

export function assertContinentalEcosystemCertified(certification: ContinentalEcosystemCertification) {
  if (certification.status !== "blocked") return certification;
  const blocking = certification.issues.filter(item => item.severity === "blocked").map(item => item.message).join(" | ");
  throw new Error(`Continental ecosystem blocked for ${certification.sourceSeason}: ${blocking}`);
}
