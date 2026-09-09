import type { EuropeClubRoster } from "../europe-2026/top-leagues";
export type AddedCompetitionId="POR1"|"POR2"|"GER1"|"GER2"|"ITA1"|"ITA2"|"USA1"|"RUS1"|"KSA1";
export type AddedCompetitionRoster={id:AddedCompetitionId;name:string;shortName:string;country:string;season:2026;startDate:string;roundCadenceDays:number;doubleRoundRobin:true;benchSize:number;maxSubstitutions:number;clubs:EuropeClubRoster[]};
export const ADDED_2026_COMPETITIONS:AddedCompetitionRoster[]=[];
