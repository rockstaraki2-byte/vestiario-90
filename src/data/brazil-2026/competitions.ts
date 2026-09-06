import{BRASILEIRAO_2026_CLUBS}from"../brasileirao-2026/rosters";
import{EUROPE_2026_COMPETITIONS,type EuropeCompetitionId}from"../europe-2026/top-leagues";
import{BRAZIL_2026_EXPANDED_COMPETITIONS,type ExpandedClubRoster}from"./expanded-rosters";

export type BrazilProfessionalCompetitionId="BRA1"|"BRA2"|"BRA3";
export type ProfessionalCompetitionId=BrazilProfessionalCompetitionId|EuropeCompetitionId;
export type YouthCompetitionId="CB20"|"SPjr";
export type GameCompetitionId=ProfessionalCompetitionId|YouthCompetitionId;
export type BrazilCompetitionId=GameCompetitionId;
export type CompetitionKind="professional"|"youth";
export type CompetitionClubRoster=ExpandedClubRoster;
export type CompetitionDefinition={
 id:GameCompetitionId;name:string;shortName:string;kind:CompetitionKind;country:string;season:number;selectableAsCareer:boolean;
 startDate:string;roundCadenceDays:number;doubleRoundRobin:boolean;benchSize:number;maxSubstitutions:number;clubs:CompetitionClubRoster[];
};
export type BrazilCompetitionDefinition=CompetitionDefinition;

const serieA:CompetitionClubRoster[]=BRASILEIRAO_2026_CLUBS.map(club=>({...club}));
const expanded=new Map(BRAZIL_2026_EXPANDED_COMPETITIONS.map(item=>[item.id,item]));
const get=(id:"BRA2"|"BRA3"|"CB20"|"SPjr")=>{const value=expanded.get(id);if(!value)throw new Error(`Competição ${id} não encontrada no snapshot 2026`);return value.clubs;};

export const BRAZIL_2026_COMPETITIONS:CompetitionDefinition[]=[
 {id:"BRA1",name:"Campeonato Brasileiro Série A",shortName:"Série A",kind:"professional",country:"Brasil",season:2026,selectableAsCareer:true,startDate:"2026-01-28",roundCadenceDays:7,doubleRoundRobin:true,benchSize:12,maxSubstitutions:5,clubs:serieA},
 {id:"BRA2",name:"Campeonato Brasileiro Série B",shortName:"Série B",kind:"professional",country:"Brasil",season:2026,selectableAsCareer:true,startDate:"2026-03-21",roundCadenceDays:7,doubleRoundRobin:true,benchSize:12,maxSubstitutions:5,clubs:get("BRA2")},
 {id:"BRA3",name:"Campeonato Brasileiro Série C",shortName:"Série C",kind:"professional",country:"Brasil",season:2026,selectableAsCareer:true,startDate:"2026-04-04",roundCadenceDays:7,doubleRoundRobin:false,benchSize:12,maxSubstitutions:5,clubs:get("BRA3")},
 {id:"CB20",name:"Campeonato Brasileiro Sub-20",shortName:"Brasileiro Sub-20",kind:"youth",country:"Brasil",season:2026,selectableAsCareer:false,startDate:"2026-03-01",roundCadenceDays:7,doubleRoundRobin:false,benchSize:12,maxSubstitutions:5,clubs:get("CB20")},
 {id:"SPjr",name:"Copa São Paulo de Futebol Júnior",shortName:"Copinha",kind:"youth",country:"Brasil",season:2026,selectableAsCareer:false,startDate:"2026-01-02",roundCadenceDays:3,doubleRoundRobin:false,benchSize:12,maxSubstitutions:5,clubs:get("SPjr")},
];
const EUROPE_COMPETITIONS:CompetitionDefinition[]=EUROPE_2026_COMPETITIONS.map(item=>({id:item.id,name:item.name,shortName:item.shortName,kind:"professional",country:item.country,season:item.season,selectableAsCareer:true,startDate:item.startDate,roundCadenceDays:item.roundCadenceDays,doubleRoundRobin:item.doubleRoundRobin,benchSize:item.benchSize,maxSubstitutions:item.maxSubstitutions,clubs:item.clubs}));
export const ALL_2026_COMPETITIONS:CompetitionDefinition[]=[...BRAZIL_2026_COMPETITIONS,...EUROPE_COMPETITIONS];
export const PROFESSIONAL_COMPETITIONS=ALL_2026_COMPETITIONS.filter((item):item is CompetitionDefinition&{id:ProfessionalCompetitionId}=>item.kind==="professional"&&item.selectableAsCareer);
export const YOUTH_COMPETITIONS=BRAZIL_2026_COMPETITIONS.filter(item=>item.kind==="youth");
export function competitionById(id:GameCompetitionId){return ALL_2026_COMPETITIONS.find(item=>item.id===id)??BRAZIL_2026_COMPETITIONS[0];}
export function professionalCompetitionById(id:ProfessionalCompetitionId){return PROFESSIONAL_COMPETITIONS.find(item=>item.id===id)??PROFESSIONAL_COMPETITIONS[0];}
export function competitionStartDate(id:ProfessionalCompetitionId,year:number){const base=professionalCompetitionById(id).startDate;return`${year}${base.slice(4)}`;}
