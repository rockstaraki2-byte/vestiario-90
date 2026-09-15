import fs from "node:fs";

const enginePath = "src/game-engine/season-ecosystem.ts";
let source = fs.readFileSync(enginePath, "utf8");
const marker = "./continental-access-paths";

if (!source.includes("./continental-ecosystem-certification")) {
  throw new Error("Sprint 12 requires Sprint 11 continental certification patch first.");
}

if (!source.includes(marker)) {
  const replace = (from, to, label) => {
    if (!source.includes(from)) throw new Error(`Sprint 12 patch failed: ${label}`);
    source = source.replace(from, to);
  };

  replace(
    'import { assertContinentalEcosystemCertified, certifyContinentalEcosystem, type ContinentalEcosystemCertification } from "./continental-ecosystem-certification";',
    'import { assertContinentalEcosystemCertified, certifyContinentalEcosystem, type ContinentalEcosystemCertification } from "./continental-ecosystem-certification";\nimport { resolveContinentalAccessPaths, type ContinentalAccessResolution } from "./continental-access-paths";',
    "access path import",
  );

  replace(
    'export type SeasonArchive={year:number;leagues:LeagueArchive[];continental:Array<{competitionId:WorldCompetitionId;name:string;champion:string;runnerUp?:string}>;movements:DomesticMovement[];qualifiers:Array<{competitionId:WorldCompetitionId;clubs:string[];entries?:ArchivedQualificationEntry[]}>;associationRanking?:ReturnType<typeof associationCoefficientRanking>;continentalCertification?:ContinentalEcosystemCertification};',
    'export type SeasonArchive={year:number;leagues:LeagueArchive[];continental:Array<{competitionId:WorldCompetitionId;name:string;champion:string;runnerUp?:string}>;movements:DomesticMovement[];qualifiers:Array<{competitionId:WorldCompetitionId;clubs:string[];entries?:ArchivedQualificationEntry[]}>;associationRanking?:ReturnType<typeof associationCoefficientRanking>;continentalCertification?:ContinentalEcosystemCertification;continentalAccessPaths?:ContinentalAccessResolution[]};',
    "archive access paths",
  );

  replace(
    'export type FootballEcosystemState={archives:SeasonArchive[];coefficients:Record<string,number>;associationCoefficients:AssociationCoefficientSeason[];nextDomesticParticipants:Partial<Record<ProfessionalCompetitionId,string[]>>;nextInternationalEntrants:Partial<Record<WorldCompetitionId,QualificationEntrant[]>>;continentalCertification?:ContinentalEcosystemCertification;lastFinalizedYear?:number};',
    'export type FootballEcosystemState={archives:SeasonArchive[];coefficients:Record<string,number>;associationCoefficients:AssociationCoefficientSeason[];nextDomesticParticipants:Partial<Record<ProfessionalCompetitionId,string[]>>;nextInternationalEntrants:Partial<Record<WorldCompetitionId,QualificationEntrant[]>>;continentalCertification?:ContinentalEcosystemCertification;continentalAccessPaths?:ContinentalAccessResolution[];lastFinalizedYear?:number};',
    "ecosystem access paths",
  );

  replace(
    'const associationHistory=updateAssociationHistory(base.associationCoefficients,associationSeasonScores(state.worldCompetitions.tournaments,state.year)),intl=internationalPlan(state,associationHistory),continentalCertification=certifyContinentalEcosystem({fields:intl,associationHistory,sourceSeason:state.year}),continental=',
    'const associationHistory=updateAssociationHistory(base.associationCoefficients,associationSeasonScores(state.worldCompetitions.tournaments,state.year)),intl=internationalPlan(state,associationHistory),accessResolution=resolveContinentalAccessPaths(intl,state.year+1),resolvedIntl=accessResolution.fields as Partial<Record<WorldCompetitionId,QualificationEntrant[]>>,continentalCertification=certifyContinentalEcosystem({fields:resolvedIntl,associationHistory,sourceSeason:state.year}),continental=',
    "resolve preliminary access before certification",
  );

  replace(
    'qualifiers:Object.entries(intl).map(([competitionId,clubs])=>({competitionId:competitionId as WorldCompetitionId,clubs:(clubs??[]).map(x=>x.name),entries:archiveQualificationEntries(clubs??[],state.year)})),associationRanking:associationCoefficientRanking(associationHistory),continentalCertification};',
    'qualifiers:Object.entries(resolvedIntl).map(([competitionId,clubs])=>({competitionId:competitionId as WorldCompetitionId,clubs:(clubs??[]).map(x=>x.name),entries:archiveQualificationEntries(clubs??[],state.year)})),associationRanking:associationCoefficientRanking(associationHistory),continentalCertification,continentalAccessPaths:accessResolution.paths};',
    "archive resolved access paths",
  );

  replace(
    'assertContinentalEcosystemCertified(continentalCertification);return{archives:[archive,...base.archives].slice(0,30),coefficients:updateCoefficients(state,base.coefficients),associationCoefficients:associationHistory,nextDomesticParticipants:nextDomestic,nextInternationalEntrants:intl,continentalCertification,lastFinalizedYear:state.year};}',
    'assertContinentalEcosystemCertified(continentalCertification);return{archives:[archive,...base.archives].slice(0,30),coefficients:updateCoefficients(state,base.coefficients),associationCoefficients:associationHistory,nextDomesticParticipants:nextDomestic,nextInternationalEntrants:resolvedIntl,continentalCertification,continentalAccessPaths:accessResolution.paths,lastFinalizedYear:state.year};}',
    "persist resolved access field",
  );

  fs.writeFileSync(enginePath, source);
}

console.log("Sprint 12 continental access routes applied.");
