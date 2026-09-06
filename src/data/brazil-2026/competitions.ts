import{BRASILEIRAO_2026_CLUBS}from"../brasileirao-2026/rosters";
import{BRAZIL_2026_EXPANDED_COMPETITIONS,type ExpandedClubRoster}from"./expanded-rosters";

export type ProfessionalCompetitionId="BRA1"|"BRA2"|"BRA3";
export type YouthCompetitionId="CB20"|"SPjr";
export type BrazilCompetitionId=ProfessionalCompetitionId|YouthCompetitionId;
export type CompetitionKind="professional"|"youth";
export type CompetitionClubRoster=ExpandedClubRoster;
export type BrazilCompetitionDefinition={
 id:BrazilCompetitionId;name:string;shortName:string;kind:CompetitionKind;season:number;selectableAsCareer:boolean;
 startDate:string;roundCadenceDays:number;doubleRoundRobin:boolean;clubs:CompetitionClubRoster[];
};

const serieA:CompetitionClubRoster[]=BRASILEIRAO_2026_CLUBS.map(club=>({...club}));
const expanded=new Map(BRAZIL_2026_EXPANDED_COMPETITIONS.map(item=>[item.id,item]));
const get=(id:"BRA2"|"BRA3"|"CB20"|"SPjr")=>{const value=expanded.get(id);if(!value)throw new Error(`Competição ${id} não encontrada no snapshot 2026`);return value.clubs;};

export const BRAZIL_2026_COMPETITIONS:BrazilCompetitionDefinition[]=[
 {id:"BRA1",name:"Campeonato Brasileiro Série A",shortName:"Série A",kind:"professional",season:2026,selectableAsCareer:true,startDate:"2026-01-28",roundCadenceDays:7,doubleRoundRobin:true,clubs:serieA},
 {id:"BRA2",name:"Campeonato Brasileiro Série B",shortName:"Série B",kind:"professional",season:2026,selectableAsCareer:true,startDate:"2026-03-21",roundCadenceDays:7,doubleRoundRobin:true,clubs:get("BRA2")},
 {id:"BRA3",name:"Campeonato Brasileiro Série C",shortName:"Série C",kind:"professional",season:2026,selectableAsCareer:true,startDate:"2026-04-04",roundCadenceDays:7,doubleRoundRobin:false,clubs:get("BRA3")},
 {id:"CB20",name:"Campeonato Brasileiro Sub-20",shortName:"Brasileiro Sub-20",kind:"youth",season:2026,selectableAsCareer:false,startDate:"2026-03-01",roundCadenceDays:7,doubleRoundRobin:false,clubs:get("CB20")},
 {id:"SPjr",name:"Copa São Paulo de Futebol Júnior",shortName:"Copinha",kind:"youth",season:2026,selectableAsCareer:false,startDate:"2026-01-02",roundCadenceDays:3,doubleRoundRobin:false,clubs:get("SPjr")},
];
export const PROFESSIONAL_COMPETITIONS=BRAZIL_2026_COMPETITIONS.filter((item):item is BrazilCompetitionDefinition&{id:ProfessionalCompetitionId}=>item.selectableAsCareer);
export const YOUTH_COMPETITIONS=BRAZIL_2026_COMPETITIONS.filter(item=>item.kind==="youth");
export function competitionById(id:BrazilCompetitionId){return BRAZIL_2026_COMPETITIONS.find(item=>item.id===id)??BRAZIL_2026_COMPETITIONS[0];}
export function professionalCompetitionById(id:ProfessionalCompetitionId){return PROFESSIONAL_COMPETITIONS.find(item=>item.id===id)??PROFESSIONAL_COMPETITIONS[0];}
export function competitionStartDate(id:ProfessionalCompetitionId,year:number){const base=professionalCompetitionById(id).startDate;return`${year}${base.slice(4)}`;}
