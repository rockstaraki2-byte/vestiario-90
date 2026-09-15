import fs from "node:fs";

const enginePath = "src/game-engine/season-ecosystem.ts";
let source = fs.readFileSync(enginePath, "utf8");
const marker = "./qualification-ecosystem";

if (!source.includes(marker)) {
  const replace = (from, to, label) => {
    if (!source.includes(from)) throw new Error(`Sprint 10 patch failed: ${label}`);
    source = source.replace(from, to);
  };

  replace(
    'import { completeRealQualificationField, NEXT_SEASON_TOP_LEAGUE_SLOTS } from "./next-season-qualification";',
    'import { completeRealQualificationField, NEXT_SEASON_TOP_LEAGUE_SLOTS } from "./next-season-qualification";\nimport { archiveQualificationEntries, associationCoefficientRanking, associationSeasonScores, enrichQualificationEntries, topPerformanceAssociations, updateAssociationHistory, type AssociationCoefficientSeason, type ArchivedQualificationEntry, type QualificationProvenance } from "./qualification-ecosystem";',
    "engine imports",
  );

  replace(
    'export type QualificationEntrant={name:string;shortName:string;country:string;reputation:number;reason:string};',
    'export type QualificationEntrant={name:string;shortName:string;country:string;reputation:number;reason:string;provenance?:QualificationProvenance};',
    "qualification entrant provenance",
  );

  replace(
    'export type SeasonArchive={year:number;leagues:LeagueArchive[];continental:Array<{competitionId:WorldCompetitionId;name:string;champion:string;runnerUp?:string}>;movements:DomesticMovement[];qualifiers:Array<{competitionId:WorldCompetitionId;clubs:string[]}>};',
    'export type SeasonArchive={year:number;leagues:LeagueArchive[];continental:Array<{competitionId:WorldCompetitionId;name:string;champion:string;runnerUp?:string}>;movements:DomesticMovement[];qualifiers:Array<{competitionId:WorldCompetitionId;clubs:string[];entries?:ArchivedQualificationEntry[]}>;associationRanking?:ReturnType<typeof associationCoefficientRanking>};',
    "season archive provenance",
  );

  replace(
    'export type FootballEcosystemState={archives:SeasonArchive[];coefficients:Record<string,number>;nextDomesticParticipants:Partial<Record<ProfessionalCompetitionId,string[]>>;nextInternationalEntrants:Partial<Record<WorldCompetitionId,QualificationEntrant[]>>;lastFinalizedYear?:number};',
    'export type FootballEcosystemState={archives:SeasonArchive[];coefficients:Record<string,number>;associationCoefficients:AssociationCoefficientSeason[];nextDomesticParticipants:Partial<Record<ProfessionalCompetitionId,string[]>>;nextInternationalEntrants:Partial<Record<WorldCompetitionId,QualificationEntrant[]>>;lastFinalizedYear?:number};',
    "association coefficient state",
  );

  replace(
    'export function createFootballEcosystem():FootballEcosystemState{return{archives:[],coefficients:{},nextDomesticParticipants:{},nextInternationalEntrants:{}};}',
    'export function createFootballEcosystem():FootballEcosystemState{return{archives:[],coefficients:{},associationCoefficients:[],nextDomesticParticipants:{},nextInternationalEntrants:{}};}',
    "ecosystem defaults",
  );

  replace(
    'export function hydrateFootballEcosystem(value:FootballEcosystemState|undefined){return value?{...createFootballEcosystem(),...value,archives:value.archives??[],coefficients:value.coefficients??{},nextDomesticParticipants:value.nextDomesticParticipants??{},nextInternationalEntrants:value.nextInternationalEntrants??{}}:createFootballEcosystem();}',
    'export function hydrateFootballEcosystem(value:FootballEcosystemState|undefined){return value?{...createFootballEcosystem(),...value,archives:value.archives??[],coefficients:value.coefficients??{},associationCoefficients:value.associationCoefficients??[],nextDomesticParticipants:value.nextDomesticParticipants??{},nextInternationalEntrants:value.nextInternationalEntrants??{}}:createFootballEcosystem();}',
    "save hydration",
  );

  replace(
    'return completeRealQualificationField(base,id,count,blocked);}',
    'return enrichQualificationEntries(completeRealQualificationField(base,id,count,blocked),state.year);}',
    "enrich qualification field",
  );

  replace(
    'function internationalPlan(state:SeasonState){const result:',
    'function internationalPlan(state:SeasonState,associationHistory:AssociationCoefficientSeason[]=[]){const result:',
    "international plan association history",
  );

  replace(
    'const perf=new Set(associationPerformance(state)),ucl:',
    'const perf=new Set(topPerformanceAssociations(associationHistory,2)),ucl:',
    "rolling association performance slots",
  );

  replace(
    'const intl=internationalPlan(state),continental=',
    'const associationHistory=updateAssociationHistory(base.associationCoefficients,associationSeasonScores(state.worldCompetitions.tournaments,state.year)),intl=internationalPlan(state,associationHistory),continental=',
    "season coefficient update",
  );

  replace(
    'qualifiers:Object.entries(intl).map(([competitionId,clubs])=>({competitionId:competitionId as WorldCompetitionId,clubs:(clubs??[]).slice(0,12).map(x=>x.name)}))};',
    'qualifiers:Object.entries(intl).map(([competitionId,clubs])=>({competitionId:competitionId as WorldCompetitionId,clubs:(clubs??[]).map(x=>x.name),entries:archiveQualificationEntries(clubs??[],state.year)})),associationRanking:associationCoefficientRanking(associationHistory)};',
    "archive full qualification provenance",
  );

  replace(
    'return{archives:[archive,...base.archives].slice(0,30),coefficients:updateCoefficients(state,base.coefficients),nextDomesticParticipants:nextDomestic,nextInternationalEntrants:intl,lastFinalizedYear:state.year};}',
    'return{archives:[archive,...base.archives].slice(0,30),coefficients:updateCoefficients(state,base.coefficients),associationCoefficients:associationHistory,nextDomesticParticipants:nextDomestic,nextInternationalEntrants:intl,lastFinalizedYear:state.year};}',
    "persist association history",
  );

  fs.writeFileSync(enginePath, source);
}

console.log("Sprint 10 qualification ecosystem applied.");
