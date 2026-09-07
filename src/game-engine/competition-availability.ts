import type { LeagueClub, LeaguePlayer } from "./league";
import type { CompetitionGovernanceState } from "./competition-governance";
import type { WorldCompetitionId } from "./world-competitions";

export type CompetitionAvailability={eligible:boolean;reason?:string};

const disciplineKey=(competitionId:WorldCompetitionId,playerId:string)=>`${competitionId}:${playerId}`;

export function competitionAvailability(value:CompetitionGovernanceState,competitionId:WorldCompetitionId,player:LeaguePlayer):CompetitionAvailability{
  if(player.injuryDays>0)return{eligible:false,reason:`Lesionado • ${player.injuryDays} dia(s) estimado(s)`};
  if(player.suspensionMatches>0)return{eligible:false,reason:`Suspenso no calendário nacional • ${player.suspensionMatches} jogo(s)`};
  const discipline=value.discipline[disciplineKey(competitionId,player.id)];
  if((discipline?.suspensionMatches??0)>0)return{eligible:false,reason:`Suspenso nesta competição • ${discipline!.suspensionMatches} jogo(s)`};
  const registration=value.registrations[competitionId];
  if(registration&&!registration.listAIds.includes(player.id)&&!registration.listBIds.includes(player.id))return{eligible:false,reason:"Não inscrito na Lista A/B desta competição"};
  return{eligible:true};
}

export function competitionAvailabilityMap(value:CompetitionGovernanceState,competitionId:WorldCompetitionId,club:LeagueClub){
  return Object.fromEntries(club.players.map(player=>[player.id,competitionAvailability(value,competitionId,player)]));
}
