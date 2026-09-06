import type { SoccerWikiClubIdentity, SoccerWikiCompetitionIdentity, SoccerWikiPlayerIdentity } from "./types";
import { PLAYERS_01 } from "./players-01";
import { PLAYERS_02 } from "./players-02";
import { PLAYERS_03 } from "./players-03";
import { PLAYERS_04 } from "./players-04";

export const SOCCERWIKI_META={
  source:"SoccerWiki",
  snapshot:"2026-09-06",
  fullCatalogCounts:{players:104987,clubs:7072,leagues:405,cups:235,stadiums:6187,managers:12436,internationals:100},
  runtimePlayerIdentities:400,
  limitation:"O snapshot fornece identidades, mas não vínculos jogador-clube nem atributos esportivos. O Vestiário 90 usa o catálogo como identidade e simula rosters/atributos.",
} as const;

export const SOCCERWIKI_COMPETITION:SoccerWikiCompetitionIdentity={sourceId:14,name:"Brasileirão Série A",imageUrl:"https://cdn.soccerwiki.org/images/logos/leagues/14.png"};

export const SOCCERWIKI_CLUBS:SoccerWikiClubIdentity[]=[
  {sourceId:300,name:"Palmeiras",shortName:"PAL",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/300.png"},
  {sourceId:294,name:"CR Flamengo",shortName:"FLA",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/294.png"},
  {sourceId:290,name:"Corinthians",shortName:"COR",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/290.png"},
  {sourceId:306,name:"São Paulo FC",shortName:"SAO",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/306.png"},
  {sourceId:304,name:"Santos FC",shortName:"SFC",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/304.png"},
  {sourceId:602,name:"Grêmio",shortName:"GRÊ",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/602.png"},
  {sourceId:298,name:"SC Internacional",shortName:"INT",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/298.png"},
  {sourceId:292,name:"Cruzeiro EC",shortName:"CRZ",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/292.png"},
  {sourceId:286,name:"Atlético Mineiro",shortName:"CAM",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/286.png"},
  {sourceId:288,name:"Botafogo FR",shortName:"BOT",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/288.png"},
  {sourceId:295,name:"Fluminense",shortName:"FLU",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/295.png"},
  {sourceId:307,name:"Vasco da Gama",shortName:"VAS",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/307.png"},
  {sourceId:1473,name:"EC Bahia",shortName:"BAH",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/1473.png"},
  {sourceId:296,name:"Fortaleza EC",shortName:"FOR",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/296.png"},
  {sourceId:1458,name:"Ceará SC",shortName:"CEA",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/1458.png"},
  {sourceId:287,name:"Athletico Paranaense",shortName:"CAP",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/287.png"},
  {sourceId:1447,name:"RB Bragantino",shortName:"RBB",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/1447.png"},
  {sourceId:923,name:"Sport Recife",shortName:"SPO",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/923.png"},
  {sourceId:1237,name:"EC Vitória",shortName:"VTO",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/1237.png"},
  {sourceId:299,name:"Juventude",shortName:"JUV",imageUrl:"https://cdn.soccerwiki.org/images/logos/clubs/299.png"},
];

export const SOCCERWIKI_PLAYERS:SoccerWikiPlayerIdentity[]=[...PLAYERS_01,...PLAYERS_02,...PLAYERS_03,...PLAYERS_04];
