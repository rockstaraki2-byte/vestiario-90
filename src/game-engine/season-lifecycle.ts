import { sortedStandings } from "./league";
import type { SeasonState } from "./season";

export type SeasonHonor={competitionId:string;competitionName:string;championName:string;kind:"Liga"|"Copa nacional"|"Continental"|"Estadual"};
export type SeasonSummary={year:number;closedAt:string;leagueChampion:string;userLeaguePosition:number;honors:SeasonHonor[]};

function news(state:SeasonState,id:string,headline:string,summary:string,tone:"positive"|"neutral"|"negative"="neutral"){
 if(state.livingWorld.news.some(item=>item.id===id))return;
 const order=state.livingWorld.sequence+1;state.livingWorld={...state.livingWorld,sequence:order,news:[{id,headline,summary,source:"Vestiário 90 • Central de Competições",round:state.currentRound,createdOrder:order,tone},...state.livingWorld.news].slice(0,120)};
}

export function publishCompetitionChampions(state:SeasonState){
 const next=structuredClone(state);
 for(const item of next.worldCompetitions.history){
  const id=`champion-${item.year}-${item.competitionId}`;
  news(next,id,`${item.championName} é campeão da ${item.competitionName}`,`A edição ${item.year} chegou ao fim. ${item.championName} conquistou o título e a competição foi registrada no histórico do save.`,"positive");
 }
 return next;
}

function pendingUserCupMatches(state:SeasonState){return state.worldCompetitions.tournaments.some(tournament=>tournament.matches.some(match=>!match.played&&(match.home.activeClubId===state.selectedClubId||match.away.activeClubId===state.selectedClubId)));}

export function closeSeasonIfReady(state:SeasonState){
 let next=publishCompetitionChampions(state);
 if(next.completed&&next.seasonSummary?.year===next.year)return next;
 const leagueFinished=next.league.fixtures.every(fixture=>fixture.played);
 if(!leagueFinished||pendingUserCupMatches(next))return next;
 const standings=sortedStandings(next.league),championRow=standings[0],champion=next.league.clubs.find(club=>club.id===championRow?.clubId),position=Math.max(1,standings.findIndex(row=>row.clubId===next.selectedClubId)+1),honors:SeasonHonor[]=[];
 if(champion)honors.push({competitionId:next.competitionId,competitionName:next.league.competitionName??next.competitionId,championName:champion.name,kind:"Liga"});
 for(const tournament of next.worldCompetitions.tournaments.filter(item=>item.completed&&item.championId)){
  const winner=tournament.participants.find(player=>player.id===tournament.championId);if(!winner)continue;
  honors.push({competitionId:tournament.definition.id,competitionName:tournament.definition.name,championName:winner.name,kind:tournament.definition.kind});
 }
 const summary:SeasonSummary={year:next.year,closedAt:next.currentDate,leagueChampion:champion?.name??"—",userLeaguePosition:position,honors};
 const history=(next.seasonHistory??[]).filter(item=>item.year!==next.year);history.unshift(summary);
 next={...next,completed:true,championClubId:champion?.id,seasonSummary:summary,seasonHistory:history.slice(0,30)};
 if(champion)news(next,`league-champion-${next.year}-${next.competitionId}`,`${champion.name} conquista ${next.league.competitionName??"a liga"}`,`A temporada ${next.year} foi encerrada oficialmente. ${champion.name} terminou no topo da classificação.`,"positive");
 news(next,`season-closed-${next.year}`,`Temporada ${next.year} encerrada`,`${honors.length} título${honors.length===1?"":"s"} foi${honors.length===1?"":"ram"} registrado${honors.length===1?"":"s"}. O save agora está pronto para a transição de temporada.`,"neutral");
 return next;
}
