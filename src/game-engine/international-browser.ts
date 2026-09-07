import type { WorldCompetitionId, WorldCompetitionMatch, WorldParticipant, WorldTournamentState } from "./world-competitions";

export type InternationalTableRow={participant:WorldParticipant;played:number;won:number;drawn:number;lost:number;goalsFor:number;goalsAgainst:number;points:number};
export type InternationalQualification={label:string;tone:"direct"|"playoff"|"transfer"|"out"};

function table(matches:WorldCompetitionMatch[],participants:WorldParticipant[]){
  const rows=new Map(participants.map(participant=>[participant.id,{participant,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0} as InternationalTableRow]));
  for(const match of matches.filter(item=>item.played)){
    const home=rows.get(match.home.id),away=rows.get(match.away.id);if(!home||!away)continue;
    const hg=match.homeGoals??0,ag=match.awayGoals??0;home.played++;away.played++;home.goalsFor+=hg;home.goalsAgainst+=ag;away.goalsFor+=ag;away.goalsAgainst+=hg;
    if(hg>ag){home.won++;away.lost++;home.points+=3}else if(ag>hg){away.won++;home.lost++;away.points+=3}else{home.drawn++;away.drawn++;home.points++;away.points++;}
  }
  return[...rows.values()].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor||b.won-a.won||b.participant.reputation-a.participant.reputation);
}

export function competitionGroupTables(tournament:WorldTournamentState){
  const groupMatches=tournament.matches.filter(match=>Boolean(match.group));
  return[...new Set(groupMatches.map(match=>match.group!).filter(Boolean))].sort().map(group=>{
    const matches=groupMatches.filter(match=>match.group===group),ids=new Set(matches.flatMap(match=>[match.home.id,match.away.id])),participants=tournament.participants.filter(participant=>ids.has(participant.id));
    return{group,rows:table(matches,participants)};
  });
}

export function competitionLeagueTable(tournament:WorldTournamentState){
  const matches=tournament.matches.filter(match=>match.tableStage&&!match.group),ids=new Set(matches.flatMap(match=>[match.home.id,match.away.id])),participants=tournament.participants.filter(participant=>ids.has(participant.id));
  return table(matches,participants);
}

export function internationalQualification(id:WorldCompetitionId,position:number):InternationalQualification|undefined{
  if(id==="LIB"){
    if(position<=2)return{label:"Oitavas",tone:"direct"};
    if(position===3)return{label:"Play-off Sul-Americana",tone:"transfer"};
    return{label:"Eliminado",tone:"out"};
  }
  if(id==="SUD"){
    if(position===1)return{label:"Oitavas",tone:"direct"};
    if(position===2)return{label:"Play-off",tone:"playoff"};
    return{label:"Eliminado",tone:"out"};
  }
  if(id==="UCL"||id==="UEL"||id==="UECL"){
    if(position<=8)return{label:"Oitavas",tone:"direct"};
    if(position<=24)return{label:"Play-off",tone:"playoff"};
    return{label:"Eliminado",tone:"out"};
  }
  return undefined;
}

export function internationalTeamStats(tournament:WorldTournamentState){
  const rows=new Map<string,{participant:WorldParticipant;played:number;won:number;goalsFor:number;goalsAgainst:number}>();
  for(const participant of tournament.participants)rows.set(participant.id,{participant,played:0,won:0,goalsFor:0,goalsAgainst:0});
  for(const match of tournament.matches.filter(item=>item.played)){
    if(!rows.has(match.home.id))rows.set(match.home.id,{participant:match.home,played:0,won:0,goalsFor:0,goalsAgainst:0});
    if(!rows.has(match.away.id))rows.set(match.away.id,{participant:match.away,played:0,won:0,goalsFor:0,goalsAgainst:0});
    const home=rows.get(match.home.id)!,away=rows.get(match.away.id)!,hg=match.homeGoals??0,ag=match.awayGoals??0;home.played++;away.played++;home.goalsFor+=hg;home.goalsAgainst+=ag;away.goalsFor+=ag;away.goalsAgainst+=hg;if(hg>ag)home.won++;if(ag>hg)away.won++;
  }
  return[...rows.values()];
}
