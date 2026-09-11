import type { LeaguePlayer } from "./league";
import type { MatchEvent } from "./match";

const CUP_SCOPES=["CDB","LIB","SUD","FAC","CDR","CDF","UCL","UEL","UECL"] as const;
const LABELS:Record<string,string>={LEAGUE:"campeonato de liga",CDB:"Copa do Brasil",LIB:"Libertadores",SUD:"Sul-Americana",FAC:"FA Cup",CDR:"Copa do Rei",CDF:"Copa da França",UCL:"Champions League",UEL:"Europa League",UECL:"Conference League"};

export function liveCompetitionScope(seed:string){return CUP_SCOPES.find(scope=>seed.includes(`:${scope}:`))??"LEAGUE";}
export function liveCompetitionLabel(seed:string){const scope=liveCompetitionScope(seed);return LABELS[scope]??"competição";}
export function playerCompetitionGoalsAtMoment(player:LeaguePlayer,events:MatchEvent[],seed:string){
 const scope=liveCompetitionScope(seed),prior=player.competitionStats?.[scope]?.goals??(scope==="LEAGUE"&&!player.competitionStats?player.goals??0:0),live=events.filter(event=>event.type==="goal"&&event.playerId===player.id).length;
 return prior+live;
}
