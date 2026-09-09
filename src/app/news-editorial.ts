import { buildNewsEngineV2, type GeneratedSportsNews, type NewsEngineTone } from "../game-engine/news-engine";
import type { SeasonState } from "../game-engine/season";
import { aggregateScoreForMatch, type WorldCompetitionMatch, type WorldTournamentState } from "../game-engine/world-competitions";
import { aggregateLabel, competitionTable, focusGroupForTournament, tieMatches } from "./competition-view-model";

const GENERIC_TAGS=new Set(["copa","Nacional","Continental","mundo","placar","placar completo","agenda","classificação","liderança","resumo da rodada","todos os clubes","boa fase","sequência","crise","goleada","zebra","clássico"]);

export function buildEditorialSportsNews(season:SeasonState):GeneratedSportsNews[]{
 const base=buildNewsEngineV2(season).filter(item=>!item.id.startsWith("cup-")&&!item.id.startsWith("cup-match-full-"));
 const cup=buildCupEditorialNews(season);
 const unique=new Map<string,GeneratedSportsNews>();
 for(const item of [...cup,...base])if(!unique.has(item.id))unique.set(item.id,item);
 return editorialMix([...unique.values()]);
}

export function buildCupEditorialNews(season:SeasonState):GeneratedSportsNews[]{
 const out:GeneratedSportsNews[]=[];
 for(const tournament of season.worldCompetitions?.tournaments??[]){
  const played=tournament.matches.filter(isPlayed).sort((a,b)=>b.date.localeCompare(a.date)||b.roundDue-a.roundDue);
  const selected=tournament.participants.find(participant=>participant.activeClubId===season.selectedClubId);
  const latest=played[0];

  if(tournament.completed&&tournament.championId){
   const champion=tournament.participants.find(participant=>participant.id===tournament.championId);
   if(champion)out.push(story({id:`cup-champion-${tournament.definition.id}-${tournament.seasonYear}`,title:`${champion.name} é campeão da ${tournament.definition.shortName}`,summary:`O ${champion.name} fecha a ${tournament.definition.name} no topo e entra para a história da temporada ${tournament.seasonYear}.`,source:"Futebol Mundial • V90",meta:`${tournament.definition.shortName} • Campeão`,round:latest?.roundDue??season.currentRound,tone:"positive",relevance:100,tags:[tournament.definition.id,"copa",tournament.definition.kind,"título"]}));
  }

  if(!latest){
   if(!tournament.completed)out.push(story({id:`cup-preview-editorial-${tournament.definition.id}-${tournament.currentStage}`,title:`${tournament.definition.shortName}: ${tournament.currentStage} entra no radar`,summary:`A ${tournament.definition.name} está ativa no calendário. Sorteio, estreia e primeiros resultados desta fase passarão a ocupar a central de notícias.`,source:"Agenda Mundial • V90",meta:`${tournament.definition.shortName} • ${tournament.currentStage}`,round:season.currentRound,tone:"neutral",relevance:58,tags:[tournament.definition.id,"copa",tournament.definition.kind,"agenda"]}));
   continue;
  }

  const latestBatch=played.filter(match=>match.stage===latest.stage&&match.date===latest.date);
  const goals=latestBatch.reduce((sum,match)=>sum+(match.homeGoals??0)+(match.awayGoals??0),0),penalties=latestBatch.filter(match=>match.decidedByPenalties).length,userInBatch=latestBatch.some(match=>isUserMatch(match,season.selectedClubId));
  out.push(story({id:`cup-stage-${tournament.definition.id}-${latest.stage}-${latest.date}`,title:`${tournament.definition.shortName}: ${latest.stage} tem ${latestBatch.length} jogo${latestBatch.length===1?"":"s"} e ${goals} gols`,summary:`A rodada mais recente da ${tournament.definition.name} teve ${latestBatch.map(match=>`${match.home.shortName||match.home.name} ${match.homeGoals}–${match.awayGoals} ${match.away.shortName||match.away.name}`).slice(0,3).join("; ")}.${penalties?` ${penalties} confronto${penalties===1?" foi":"s foram"} decidido${penalties===1?"":"s"} nos pênaltis.`:""}`,source:tournament.definition.kind==="Continental"?"Noite de Copa • V90":"Central das Copas • V90",meta:`${tournament.definition.shortName} • ${latest.stage}`,round:latest.roundDue,tone:"neutral",relevance:Math.min(98,86+(userInBatch?7:0)+(latest.stage==="Final"?7:0)),tags:[tournament.definition.id,"copa",tournament.definition.kind,"rodada de copa"]}));

  for(const match of latestBatch.slice(0,8))out.push(matchStory(tournament,match,season.selectedClubId));

  if(selected){
   const userLatest=played.find(match=>match.home.id===selected.id||match.away.id===selected.id);
   if(userLatest){
    if(userLatest.tableStage)out.push(groupStory(tournament,userLatest,season.selectedClubId));
    else out.push(knockoutStory(tournament,userLatest,season.selectedClubId));
   }
  }
 }
 return out;
}

function matchStory(tournament:WorldTournamentState,match:WorldCompetitionMatch,selectedClubId:string):GeneratedSportsNews{
 const homeGoals=match.homeGoals??0,awayGoals=match.awayGoals??0,winner=homeGoals===awayGoals?undefined:homeGoals>awayGoals?match.home:match.away,loser=winner?.id===match.home.id?match.away:match.home,mine=isUserMatch(match,selectedClubId),aggregate=aggregateLabel(tournament,match),isFinal=match.stage==="Final";
 let title:string,tone:NewsEngineTone="neutral";
 if(winner&&loser){title=`${tournament.definition.shortName}: ${winner.name} vence ${loser.name} por ${homeGoals}–${awayGoals}`;tone="positive";}else title=`${tournament.definition.shortName}: ${match.home.name} e ${match.away.name} empatam em ${homeGoals}–${awayGoals}`;
 return story({id:`cup-editorial-match-${tournament.definition.id}-${match.id}`,title,summary:`${match.home.name} ${homeGoals}–${awayGoals} ${match.away.name}, pela ${match.stage}.${match.leg?` ${match.leg}º jogo do confronto.`:""}${aggregate?` ${aggregate}.`:""}${match.decidedByPenalties?" A definição veio nos pênaltis.":""}`,source:mine?"Vestiário 90 • Jogo do seu clube":"Placar das Copas • V90",meta:`${tournament.definition.shortName} • ${match.stage}${match.leg?` • ${match.leg}º jogo`:""}`,round:match.roundDue,tone,relevance:Math.min(100,76+(mine?16:0)+(isFinal?8:0)+(match.decidedByPenalties?5:0)+(match.leg===2?4:0)),tags:[tournament.definition.id,"copa",tournament.definition.kind,mine?"seu clube":"placar"]});
}

function groupStory(tournament:WorldTournamentState,match:WorldCompetitionMatch,clubId:string):GeneratedSportsNews{
 const group=focusGroupForTournament(tournament,match.stage,clubId),rows=competitionTable(tournament,match.stage,clubId),participant=tournament.participants.find(item=>item.activeClubId===clubId),position=participant?rows.findIndex(row=>row.participant.id===participant.id)+1:0,row=participant?rows.find(item=>item.participant.id===participant.id):undefined;
 const title=participant&&position>0?`${participant.name} é ${position}º${position===1?"":""} no ${group?`Grupo ${group}`:match.stage} da ${tournament.definition.shortName}`:`${tournament.definition.shortName}: classificação da ${match.stage} ganha forma`;
 const summary=participant&&row?`Após o compromisso mais recente, o ${participant.name} soma ${row.points} ponto${row.points===1?"":"s"} em ${row.played} jogo${row.played===1?"":"s"}, com saldo ${row.goalDifference>=0?"+":""}${row.goalDifference}. ${position<=2?"O clube está na zona de classificação.":"A disputa pela vaga segue aberta."}`:`A tabela da ${match.stage} foi atualizada com os resultados mais recentes.`;
 return story({id:`cup-group-user-${tournament.definition.id}-${match.stage}-${match.matchday??match.roundDue}`,title,summary,source:"Classificação das Copas • V90",meta:`${tournament.definition.shortName} • ${group?`Grupo ${group}`:match.stage}`,round:match.roundDue,tone:position>0&&position<=2?"positive":position>2?"negative":"neutral",relevance:96,tags:[tournament.definition.id,"copa",tournament.definition.kind,"classificação","seu clube"]});
}

function knockoutStory(tournament:WorldTournamentState,match:WorldCompetitionMatch,clubId:string):GeneratedSportsNews{
 const participant=tournament.participants.find(item=>item.activeClubId===clubId),legs=tieMatches(tournament,match),remaining=legs.filter(item=>!item.played),aggregate=aggregateScoreForMatch(tournament,match),aggregateText=aggregateLabel(tournament,match),winnerId=aggregate?.winnerId??match.winnerId,decided=remaining.length===0&&Boolean(winnerId),advanced=Boolean(participant&&winnerId===participant.id),opponent=participant?(match.home.id===participant.id?match.away:match.home):undefined;
 let title:string,tone:NewsEngineTone="neutral";
 if(participant&&decided){title=advanced?`${participant.name} elimina ${opponent?.name??"o adversário"} e avança na ${tournament.definition.shortName}`:`${participant.name} é eliminado da ${tournament.definition.shortName} por ${opponent?.name??"seu adversário"}`;tone=advanced?"positive":"negative";}
 else if(participant){title=`${participant.name} deixa confronto aberto na ${tournament.definition.shortName}`;tone="neutral";}
 else title=`${tournament.definition.shortName}: confronto da ${match.stage} segue em definição`;
 return story({id:`cup-knockout-user-${tournament.definition.id}-${match.tieId??match.id}-${match.id}`,title,summary:`${match.home.name} ${match.homeGoals??0}–${match.awayGoals??0} ${match.away.name}.${aggregateText?` ${aggregateText}.`:""}${match.decidedByPenalties?" A vaga foi definida nos pênaltis.":remaining.length?` Ainda resta ${remaining.length} jogo${remaining.length===1?"":"s"} no confronto.`:""}`,source:"Mata-mata • V90",meta:`${tournament.definition.shortName} • ${match.stage}`,round:match.roundDue,tone,relevance:decided?99:94,tags:[tournament.definition.id,"copa",tournament.definition.kind,"mata-mata","seu clube",advanced?"classificado":decided?"eliminado":"confronto aberto"]});
}

function editorialMix(items:GeneratedSportsNews[]){
 const sorted=[...items].sort((a,b)=>b.relevance-a.relevance||b.round-a.round||a.id.localeCompare(b.id));
 const buckets=new Map<string,GeneratedSportsNews[]>();
 for(const item of sorted){const key=competitionKey(item);buckets.set(key,[...(buckets.get(key)??[]),item]);}
 const keys=[...buckets.keys()].sort((a,b)=>(buckets.get(b)?.[0]?.relevance??0)-(buckets.get(a)?.[0]?.relevance??0));
 const mixed:GeneratedSportsNews[]=[];
 for(let pass=0;pass<4;pass++)for(const key of keys){const item=buckets.get(key)?.[pass];if(item)mixed.push(item);}
 const seen=new Set(mixed.map(item=>item.id));
 for(const item of sorted)if(!seen.has(item.id)){mixed.push(item);seen.add(item.id);}
 return mixed.slice(0,420);
}

function competitionKey(item:GeneratedSportsNews){return item.tags.find(tag=>!GENERIC_TAGS.has(tag)&&/^[A-Z0-9_-]{2,10}$/.test(tag))??item.meta.split(" • ")[0]??"geral";}
function isPlayed(match:WorldCompetitionMatch){return match.played&&match.homeGoals!==undefined&&match.awayGoals!==undefined;}
function isUserMatch(match:WorldCompetitionMatch,clubId:string){return match.home.activeClubId===clubId||match.away.activeClubId===clubId;}
function story(item:GeneratedSportsNews){return item;}
