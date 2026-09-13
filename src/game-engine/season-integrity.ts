import type { SeasonState } from "./season";

export type SeasonIntegritySeverity="warning"|"error";
export type SeasonIntegrityIssue={code:string;severity:SeasonIntegritySeverity;message:string};
export type SeasonIntegrityReport={ok:boolean;issues:SeasonIntegrityIssue[];warnings:number;errors:number};
export type SeasonIntegrityRepair={state:SeasonState;repairs:string[];report:SeasonIntegrityReport};

function unique<T>(items:T[]){return new Set(items).size===items.length;}
function validIsoDate(value:string|undefined){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()));}
function pendingUserCupMatches(state:SeasonState){return state.worldCompetitions.tournaments.some(tournament=>tournament.matches.some(match=>!match.played&&(match.home.activeClubId===state.selectedClubId||match.away.activeClubId===state.selectedClubId)));}
function selectedClubPlayerIds(state:SeasonState){const club=state.league.clubs.find(item=>item.id===state.selectedClubId)??state.league.clubs[0];return new Set(club?.players.map(player=>player.id)??[]);}

export function auditSeasonIntegrity(state:SeasonState):SeasonIntegrityReport{
 const issues:SeasonIntegrityIssue[]=[];
 const issue=(code:string,severity:SeasonIntegritySeverity,message:string)=>issues.push({code,severity,message});
 const clubIds=state.league.clubs.map(club=>club.id),clubSet=new Set(clubIds),standingIds=state.league.standings.map(row=>row.clubId),fixtureIds=state.league.fixtures.map(fixture=>fixture.id);
 if(!state.baseSeed)issue("SAVE_SEED_MISSING","error","O save perdeu a seed base usada para manter o mundo determinístico.");
 if(!state.league.clubs.length)issue("LEAGUE_WITHOUT_CLUBS","error","A liga ativa não possui clubes.");
 if(!unique(clubIds))issue("DUPLICATE_CLUB_ID","error","Há clubes diferentes usando o mesmo identificador na liga ativa.");
 if(!unique(fixtureIds))issue("DUPLICATE_LEAGUE_FIXTURE_ID","error","Há partidas da liga ativa com identificador duplicado.");
 if(standingIds.length!==clubIds.length||!unique(standingIds)||standingIds.some(id=>!clubSet.has(id)))issue("STANDINGS_COVERAGE","error","A classificação não corresponde exatamente aos clubes da liga ativa.");
 for(const fixture of state.league.fixtures){
  if(!clubSet.has(fixture.homeClubId)||!clubSet.has(fixture.awayClubId)||fixture.homeClubId===fixture.awayClubId)issue("INVALID_LEAGUE_FIXTURE","error",`A partida ${fixture.id} referencia clubes inválidos.`);
  if(!validIsoDate(fixture.date))issue("MISSING_LEAGUE_DATE","error",`A partida ${fixture.id} está sem uma data de calendário válida.`);
  if(fixture.played&&(fixture.homeGoals===undefined||fixture.awayGoals===undefined))issue("PLAYED_WITHOUT_SCORE","warning",`A partida ${fixture.id} está marcada como jogada sem placar persistido.`);
 }
 if(!validIsoDate(state.currentDate))issue("INVALID_CURRENT_DATE","error","A data atual do save é inválida.");
 if(state.currentRound<1||!Number.isFinite(state.currentRound))issue("INVALID_CURRENT_ROUND","error","A rodada atual do save é inválida.");
 const playerIds=selectedClubPlayerIds(state),lineup=state.lineupIds??[],bench=state.benchIds??[];
 if(!unique(lineup)||lineup.some(id=>!playerIds.has(id)))issue("INVALID_LINEUP","warning","A escalação possui duplicidades ou jogadores que não pertencem mais ao clube controlado.");
 if(!unique(bench)||bench.some(id=>!playerIds.has(id))||bench.some(id=>lineup.includes(id)))issue("INVALID_BENCH","warning","O banco possui duplicidades, jogadores inválidos ou atletas repetidos entre titulares e reservas.");
 if(state.worldCompetitions.season!==state.year)issue("WORLD_COMPETITION_SEASON_MISMATCH","warning","As copas estão vinculadas a uma temporada diferente da liga ativa.");
 if(state.worldLeagues.season!==state.year)issue("WORLD_LEAGUE_SEASON_MISMATCH","warning","As ligas paralelas estão vinculadas a uma temporada diferente da carreira.");
 const worldMatchKeys:string[]=[];
 for(const tournament of state.worldCompetitions.tournaments){
  const participantIds=new Set(tournament.participants.map(participant=>participant.id));
  for(const match of tournament.matches){
   worldMatchKeys.push(`${tournament.definition.id}:${match.id}`);
   if(!validIsoDate(match.date))issue("MISSING_CUP_DATE","error",`A partida ${match.id} de ${tournament.definition.shortName} está sem data válida.`);
   if(!participantIds.has(match.home.id)||!participantIds.has(match.away.id)||match.home.id===match.away.id)issue("INVALID_CUP_FIXTURE","error",`A partida ${match.id} de ${tournament.definition.shortName} possui participantes inválidos.`);
  }
  if(tournament.completed&&(!tournament.championId||!participantIds.has(tournament.championId)))issue("COMPLETED_TOURNAMENT_WITHOUT_CHAMPION","error",`${tournament.definition.shortName} terminou sem campeão válido.`);
 }
 if(!unique(worldMatchKeys))issue("DUPLICATE_CUP_FIXTURE_ID","error","Há partidas de copa com identificador duplicado dentro da mesma competição.");
 const historyKeys=(state.worldCompetitions.history??[]).map(item=>`${item.year}:${item.competitionId}`);
 if(!unique(historyKeys))issue("DUPLICATE_COMPETITION_HISTORY","warning","O histórico de campeões possui registros duplicados para a mesma edição.");
 const seasonYears=(state.seasonHistory??[]).map(item=>item.year);
 if(!unique(seasonYears))issue("DUPLICATE_SEASON_HISTORY","warning","O histórico da carreira possui mais de um fechamento para a mesma temporada.");
 if(state.completed){
  if(state.league.fixtures.some(fixture=>!fixture.played))issue("PREMATURE_SEASON_CLOSURE","error","A temporada foi encerrada com partidas de liga pendentes.");
  if(pendingUserCupMatches(state))issue("PREMATURE_SEASON_CLOSURE_CUP","error","A temporada foi encerrada com partida de copa pendente para o clube controlado.");
  if(!state.seasonSummary||state.seasonSummary.year!==state.year)issue("MISSING_SEASON_SUMMARY","error","A temporada encerrada não possui um resumo anual correspondente.");
  if(state.championClubId&&!clubSet.has(state.championClubId))issue("INVALID_LEAGUE_CHAMPION","error","O campeão da liga não pertence à edição encerrada.");
 }
 const errors=issues.filter(item=>item.severity==="error").length,warnings=issues.length-errors;
 return{ok:errors===0,issues,warnings,errors};
}

function dedupeBy<T>(items:T[],key:(item:T)=>string){const seen=new Set<string>();return items.filter(item=>{const value=key(item);if(seen.has(value))return false;seen.add(value);return true;});}
function finalWinnerId(tournament:SeasonState["worldCompetitions"]["tournaments"][number]){
 const finals=tournament.matches.filter(match=>match.played&&match.stage==="Final");
 const final=finals.at(-1);if(!final)return undefined;
 if(final.winnerId&&tournament.participants.some(participant=>participant.id===final.winnerId))return final.winnerId;
 if(final.homeGoals===undefined||final.awayGoals===undefined||final.homeGoals===final.awayGoals)return undefined;
 return final.homeGoals>final.awayGoals?final.home.id:final.away.id;
}

export function repairSeasonIntegrity(source:SeasonState):SeasonIntegrityRepair{
 const state=structuredClone(source),repairs:string[]=[];
 const playerIds=selectedClubPlayerIds(state),lineup=dedupeBy((state.lineupIds??[]).filter(id=>playerIds.has(id)),id=>id),lineupSet=new Set(lineup),bench=dedupeBy((state.benchIds??[]).filter(id=>playerIds.has(id)&&!lineupSet.has(id)),id=>id);
 if(lineup.length!==(state.lineupIds??[]).length||lineup.some((id,index)=>id!==state.lineupIds[index])){state.lineupIds=lineup;repairs.push("Escalação inválida foi saneada.");}
 if(bench.length!==(state.benchIds??[]).length||bench.some((id,index)=>id!==state.benchIds[index])){state.benchIds=bench;repairs.push("Banco inválido foi saneado.");}
 const history=dedupeBy(state.seasonHistory??[],item=>String(item.year));if(history.length!==(state.seasonHistory??[]).length){state.seasonHistory=history;repairs.push("Histórico anual duplicado foi consolidado.");}
 const worldHistory=dedupeBy(state.worldCompetitions.history??[],item=>`${item.year}:${item.competitionId}`);if(worldHistory.length!==(state.worldCompetitions.history??[]).length){state.worldCompetitions.history=worldHistory;repairs.push("Histórico de campeões duplicado foi consolidado.");}
 for(const tournament of state.worldCompetitions.tournaments){
  const championValid=Boolean(tournament.championId&&tournament.participants.some(participant=>participant.id===tournament.championId));
  if(tournament.completed&&!championValid){const winner=finalWinnerId(tournament);if(winner){tournament.championId=winner;repairs.push(`Campeão de ${tournament.definition.shortName} foi recuperado a partir da final.`);}}
 }
 const premature=state.completed&&(state.league.fixtures.some(fixture=>!fixture.played)||pendingUserCupMatches(state));
 if(premature){state.completed=false;state.seasonSummary=undefined;repairs.push("Fechamento prematuro da temporada foi reaberto automaticamente.");}
 if(!Number.isFinite(state.currentRound)||state.currentRound<1){state.currentRound=1;repairs.push("Rodada atual inválida foi restaurada para 1.");}
 return{state,repairs,report:auditSeasonIntegrity(state)};
}
