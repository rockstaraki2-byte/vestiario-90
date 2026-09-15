import fs from "node:fs";

const enginePath = "src/game-engine/season-ecosystem.ts";
let source = fs.readFileSync(enginePath, "utf8");
const marker = "./continental-ecosystem-certification";

if (!source.includes("./qualification-ecosystem")) {
  throw new Error("Sprint 11 requires Sprint 10 qualification ecosystem patch first.");
}

if (!source.includes(marker)) {
  const replace = (from, to, label) => {
    if (!source.includes(from)) throw new Error(`Sprint 11 patch failed: ${label}`);
    source = source.replace(from, to);
  };

  replace(
    'import { archiveQualificationEntries, associationCoefficientRanking, associationSeasonScores, enrichQualificationEntries, topPerformanceAssociations, updateAssociationHistory, type AssociationCoefficientSeason, type ArchivedQualificationEntry, type QualificationProvenance } from "./qualification-ecosystem";',
    'import { archiveQualificationEntries, associationCoefficientRanking, associationSeasonScores, enrichQualificationEntries, topPerformanceAssociations, updateAssociationHistory, type AssociationCoefficientSeason, type ArchivedQualificationEntry, type QualificationProvenance } from "./qualification-ecosystem";\nimport { assertContinentalEcosystemCertified, certifyContinentalEcosystem, type ContinentalEcosystemCertification } from "./continental-ecosystem-certification";',
    "certification import",
  );

  replace(
    'export type SeasonArchive={year:number;leagues:LeagueArchive[];continental:Array<{competitionId:WorldCompetitionId;name:string;champion:string;runnerUp?:string}>;movements:DomesticMovement[];qualifiers:Array<{competitionId:WorldCompetitionId;clubs:string[];entries?:ArchivedQualificationEntry[]}>;associationRanking?:ReturnType<typeof associationCoefficientRanking>};',
    'export type SeasonArchive={year:number;leagues:LeagueArchive[];continental:Array<{competitionId:WorldCompetitionId;name:string;champion:string;runnerUp?:string}>;movements:DomesticMovement[];qualifiers:Array<{competitionId:WorldCompetitionId;clubs:string[];entries?:ArchivedQualificationEntry[]}>;associationRanking?:ReturnType<typeof associationCoefficientRanking>;continentalCertification?:ContinentalEcosystemCertification};',
    "archive certification",
  );

  replace(
    'export type FootballEcosystemState={archives:SeasonArchive[];coefficients:Record<string,number>;associationCoefficients:AssociationCoefficientSeason[];nextDomesticParticipants:Partial<Record<ProfessionalCompetitionId,string[]>>;nextInternationalEntrants:Partial<Record<WorldCompetitionId,QualificationEntrant[]>>;lastFinalizedYear?:number};',
    'export type FootballEcosystemState={archives:SeasonArchive[];coefficients:Record<string,number>;associationCoefficients:AssociationCoefficientSeason[];nextDomesticParticipants:Partial<Record<ProfessionalCompetitionId,string[]>>;nextInternationalEntrants:Partial<Record<WorldCompetitionId,QualificationEntrant[]>>;continentalCertification?:ContinentalEcosystemCertification;lastFinalizedYear?:number};',
    "ecosystem certification state",
  );

  replace(
    'const associationHistory=updateAssociationHistory(base.associationCoefficients,associationSeasonScores(state.worldCompetitions.tournaments,state.year)),intl=internationalPlan(state,associationHistory),continental=',
    'const associationHistory=updateAssociationHistory(base.associationCoefficients,associationSeasonScores(state.worldCompetitions.tournaments,state.year)),intl=internationalPlan(state,associationHistory),continentalCertification=certifyContinentalEcosystem({fields:intl,associationHistory,sourceSeason:state.year}),continental=',
    "compute certification",
  );

  replace(
    'qualifiers:Object.entries(intl).map(([competitionId,clubs])=>({competitionId:competitionId as WorldCompetitionId,clubs:(clubs??[]).map(x=>x.name),entries:archiveQualificationEntries(clubs??[],state.year)})),associationRanking:associationCoefficientRanking(associationHistory)};',
    'qualifiers:Object.entries(intl).map(([competitionId,clubs])=>({competitionId:competitionId as WorldCompetitionId,clubs:(clubs??[]).map(x=>x.name),entries:archiveQualificationEntries(clubs??[],state.year)})),associationRanking:associationCoefficientRanking(associationHistory),continentalCertification};',
    "archive certification snapshot",
  );

  replace(
    'return{archives:[archive,...base.archives].slice(0,30),coefficients:updateCoefficients(state,base.coefficients),associationCoefficients:associationHistory,nextDomesticParticipants:nextDomestic,nextInternationalEntrants:intl,lastFinalizedYear:state.year};}',
    'assertContinentalEcosystemCertified(continentalCertification);return{archives:[archive,...base.archives].slice(0,30),coefficients:updateCoefficients(state,base.coefficients),associationCoefficients:associationHistory,nextDomesticParticipants:nextDomestic,nextInternationalEntrants:intl,continentalCertification,lastFinalizedYear:state.year};}',
    "block invalid rollover",
  );

  fs.writeFileSync(enginePath, source);
}

console.log("Sprint 11 continental ecosystem certification applied.");
