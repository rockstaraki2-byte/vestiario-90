import { REAL_ROSTER_OVERRIDES_SNAPSHOT } from "./real-roster-overrides-2026";

export const DATABASE_RELEASE = {
  id: `v90-db-${REAL_ROSTER_OVERRIDES_SNAPSHOT}`,
  schemaVersion: 2,
  baselineSeason: 2026,
  snapshot: REAL_ROSTER_OVERRIDES_SNAPSHOT,
  saveCompatibility: "preserved",
  applicationPolicy: "new-career-or-next-season-transition",
  notes: [
    "Movimentações reais ficam versionadas por snapshot e não reescrevem saves em andamento.",
    "Promoção, rebaixamento e vagas continentais são calculados na virada de temporada do save.",
    "A pirâmide brasileira acompanha a expansão oficial da Série C e os seis acessos da Série D a partir de 2026.",
  ],
} as const;

export type DatabaseRelease = typeof DATABASE_RELEASE;
