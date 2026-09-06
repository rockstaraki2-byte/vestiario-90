import type { SoccerWikiClubIdentity, SoccerWikiCompetitionIdentity, SoccerWikiPlayerIdentity } from "./types";
import { PLAYERS_01 } from "./players-01";
import { PLAYERS_02 } from "./players-02";
import { PLAYERS_03 } from "./players-03";
import { PLAYERS_04 } from "./players-04";
import { BRASILEIRAO_2026_CLUBS, BRASILEIRAO_2026_ROSTER_META } from "../brasileirao-2026/rosters";

export const SOCCERWIKI_META={
  source:"SoccerWiki",
  snapshot:"2026-09-06",
  fullCatalogCounts:{players:104987,clubs:7072,leagues:405,cups:235,stadiums:6187,managers:12436,internationals:100},
  runtimePlayerIdentities:400,
  rosterSource:BRASILEIRAO_2026_ROSTER_META.source,
  rosterSnapshot:BRASILEIRAO_2026_ROSTER_META.snapshot,
  limitation:"O SoccerWiki fornece as identidades visuais. Os vínculos jogador-clube da Série A 2026 foram enriquecidos por pesquisa web; idade, overall e demais atributos esportivos seguem simulados pelo Vestiário 90.",
} as const;

export const SOCCERWIKI_COMPETITION:SoccerWikiCompetitionIdentity={sourceId:14,name:"Brasileirão Série A",imageUrl:"https://cdn.soccerwiki.org/images/logos/leagues/14.png"};

export const SOCCERWIKI_CLUBS:SoccerWikiClubIdentity[]=BRASILEIRAO_2026_CLUBS.map(({sourceId,name,shortName,imageUrl})=>({sourceId,name,shortName,imageUrl}));
export const SOCCERWIKI_PLAYERS:SoccerWikiPlayerIdentity[]=[...PLAYERS_01,...PLAYERS_02,...PLAYERS_03,...PLAYERS_04];
