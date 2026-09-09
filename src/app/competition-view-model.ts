import { aggregateScoreForMatch, type WorldCompetitionMatch, type WorldParticipant, type WorldTournamentState } from "../game-engine/world-competitions";

export type CompetitionTableRow={
 participant:WorldParticipant;
 played:number;
 won:number;
 drawn:number;
 lost:number;
 goalsFor:number;
 goalsAgainst:number;
 goalDifference:number;
 points:number;
};

export function competitionTable(tournament:WorldTournamentState,stage:string,focusClubId?:string):CompetitionTableRow[]{
 const all=tournament.matches.filter(match=>match.stage===stage&&match.tableStage);
 const focus=focusClubId?tournament.participants.find(participant=>participant.activeClubId===focusClubId):undefined;
 const focusGroup=focus?all.find(match=>match.group&&(match.home.id===focus.id||match.away.id===focus.id))?.group:undefined;
 const matches=focusGroup?all.filter(match=>match.group===focusGroup):all;
 const ids=new Set(matches.flatMap(match=>[match.home.id,match.away.id]));
 const participants=tournament.participants.filter(participant=>ids.has(participant.id));
 const rows=new Map(participants.map(participant=>[participant.id,{participant,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,goalDifference:0,points:0}]));
 for(const match of matches.filter(item=>item.played)){
  const home=rows.get(match.home.id),away=rows.get(match.away.id);if(!home||!away)continue;
  const hg=match.homeGoals??0,ag=match.awayGoals??0;
  home.played++;away.played++;home.goalsFor+=hg;home.goalsAgainst+=ag;away.goalsFor+=ag;away.goalsAgainst+=hg;
  if(hg>ag){home.won++;away.lost++;home.points+=3}else if(ag>hg){away.won++;home.lost++;away.points+=3}else{home.drawn++;away.drawn++;home.points++;away.points++}
 }
 for(const row of rows.values())row.goalDifference=row.goalsFor-row.goalsAgainst;
 return[...rows.values()].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor||b.won-a.won||b.participant.reputation-a.participant.reputation);
}

export function focusGroupForTournament(tournament:WorldTournamentState,stage:string,clubId:string){
 const participant=tournament.participants.find(item=>item.activeClubId===clubId);if(!participant)return undefined;
 return tournament.matches.find(match=>match.stage===stage&&match.group&&(match.home.id===participant.id||match.away.id===participant.id))?.group;
}

export function postMatchCompetitionResults(tournament:WorldTournamentState,match:WorldCompetitionMatch){
 const same=tournament.matches.filter(item=>item.played&&item.stage===match.stage&&(match.tableStage?item.matchday===match.matchday:(item.leg??1)===(match.leg??1)));
 return same.sort((a,b)=>Number(b.id===match.id)-Number(a.id===match.id)||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}

export function tieMatches(tournament:WorldTournamentState,match:WorldCompetitionMatch){
 if(!match.tieId)return[match];
 return tournament.matches.filter(item=>item.tieId===match.tieId).sort((a,b)=>(a.leg??1)-(b.leg??1));
}

export function aggregateLabel(tournament:WorldTournamentState,match:WorldCompetitionMatch){
 const aggregate=aggregateScoreForMatch(tournament,match);if(!aggregate||aggregate.legsPlayed===0)return undefined;
 const status=aggregate.legsPlayed<aggregate.legsTotal?"Agregado parcial":"Agregado";
 return`${status} ${aggregate.homeGoals}–${aggregate.awayGoals}${aggregate.decidedByPenalties?" • pênaltis":""}`;
}

export function userTournamentStages(tournament:WorldTournamentState,clubId:string){
 const stages=tournament.definition.stages.map(stage=>stage.name);
 const userParticipant=tournament.participants.find(participant=>participant.activeClubId===clubId);
 if(!userParticipant)return stages.filter(stage=>tournament.matches.some(match=>match.stage===stage));
 const userStages=new Set(tournament.matches.filter(match=>match.home.id===userParticipant.id||match.away.id===userParticipant.id).map(match=>match.stage));
 return stages.filter(stage=>userStages.has(stage)||stage===tournament.currentStage);
}
