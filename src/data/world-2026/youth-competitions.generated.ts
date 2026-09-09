import type { EuropeClubRoster } from "../europe-2026/top-leagues";
export type YouthWorldCompetitionId="ENGU21"|"ENGU18"|"ITAU20"|"USADEV"|"RUSU17"|"RUSU16";
export type YouthWorldCompetitionRoster={id:YouthWorldCompetitionId;tmCode:string;name:string;country:string;level:string;season:string;clubs:EuropeClubRoster[]};
export const YOUTH_WORLD_2026_COMPETITIONS:YouthWorldCompetitionRoster[]=[];
