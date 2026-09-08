import { professionalCompetitionById } from "../data/brazil-2026/competitions";
import { sortedStandings, type LeagueClub, type LeagueFixture } from "./league";
import type { SeasonState } from "./season";

export type NewsEngineTone="positive"|"neutral"|"negative";
export type GeneratedSportsNews={
 id:string;
 title:string;
 summary:string;
 source:string;
 meta:string;
 round:number;
 tone:NewsEngineTone;
 relevance:number;
 tags:string[];
};

const score=(fixture:LeagueFixture)=>`${fixture.homeGoals??0}–${fixture.awayGoals??0}`;
const margin=(fixture:LeagueFixture)=>Math.abs((fixture.homeGoals??0)-(fixture.awayGoals??0));
const totalGoals=(fixture:LeagueFixture)=>(fixture.homeGoals??0)+(fixture.awayGoals??0);
const isDraw=(fixture:LeagueFixture)=>(fixture.homeGoals??0)===(fixture.awayGoals??0);

function winnerLoser(fixture:LeagueFixture,clubs:Map<string,LeagueClub>){
 const home=clubs.get(fixture.homeClubId),away=clubs.get(fixture.awayClubId);
 if(!home||!away||isDraw(fixture))return{};
 return (fixture.homeGoals??0)>(fixture.awayGoals??0)?{winner:home,loser:away}:{winner:away,loser:home};
}

function clubResult(fixture:LeagueFixture,clubId:string){
 const home=fixture.homeClubId===clubId,gf=home?fixture.homeGoals:fixture.awayGoals,ga=home?fixture.awayGoals:fixture.homeGoals;
 if(gf===undefined||ga===undefined)return undefined;
 return gf>ga?"V":gf<ga?"D":"E";
}

export function buildNewsEngineV2(season:SeasonState):GeneratedSportsNews[]{
 const competition=professionalCompetitionById(season.competitionId??season.league.competitionId??"BRA1"),clubs=new Map(season.league.clubs.map(club=>[club.id,club])),standings=sortedStandings(season.league),played=season.league.fixtures.filter(f=>f.played&&f.homeGoals!==undefined&&f.awayGoals!==undefined),latestRound=Math.max(0,...played.map(f=>f.round)),rounds=new Map<number,LeagueFixture[]>(),out:GeneratedSportsNews[]=[];
 for(const fixture of played){rounds.set(fixture.round,[...(rounds.get(fixture.round)??[]),fixture]);}
 const reputations=[...season.league.clubs].sort((a,b)=>b.reputation-a.reputation),headlineClubs=new Set(reputations.slice(0,Math.min(6,reputations.length)).map(c=>c.id));
 const leader=standings[0],leaderClub=leader?clubs.get(leader.clubId):undefined;
 const selectedClubId=season.selectedClubId;

 for(const [round,fixtures] of [...rounds.entries()].sort((a,b)=>b[0]-a[0]).slice(0,12)){
  if(!fixtures.length)continue;
  const biggest=[...fixtures].sort((a,b)=>margin(b)-margin(a)||totalGoals(b)-totalGoals(a))[0],bigHome=clubs.get(biggest.homeClubId),bigAway=clubs.get(biggest.awayClubId),goals=fixtures.reduce((sum,f)=>sum+totalGoals(f),0),draws=fixtures.filter(isDraw).length;
  const upsets=fixtures.map(f=>({fixture:f,...winnerLoser(f,clubs)})).filter(item=>item.winner&&item.loser&&(item.loser!.reputation-item.winner!.reputation)>=8).sort((a,b)=>(b.loser!.reputation-b.winner!.reputation)-(a.loser!.reputation-a.winner!.reputation));
  const upset=upsets[0];
  const latestBoost=round===latestRound?18:0;
  out.push({id:`round-summary-${competition.id}-${round}`,title:`Resumo da rodada ${round}: ${goals} gols e ${draws} empate${draws===1?"":"s"}`,summary:`O maior placar foi ${bigHome?.shortName??"Casa"} ${score(biggest)} ${bigAway?.shortName??"Fora"}.${upset?` A zebra da rodada foi a vitória do ${upset.winner!.name} sobre o ${upset.loser!.name}.`:""}${round===latestRound&&leaderClub?` O ${leaderClub.name} fecha a rodada na liderança com ${leader.points} pontos.`:""}`,source:"Futebol Agora • Redação V90",meta:`${competition.shortName} • Rodada ${round}`,round,tone:"neutral",relevance:72+latestBoost,tags:["resumo da rodada",competition.id]});

  for(const fixture of fixtures){
   const home=clubs.get(fixture.homeClubId),away=clubs.get(fixture.awayClubId);if(!home||!away)continue;
   const {winner,loser}=winnerLoser(fixture,clubs),m=margin(fixture),goalsInMatch=totalGoals(fixture),isHeadline=headlineClubs.has(home.id)||headlineClubs.has(away.id),isSelected=home.id===selectedClubId||away.id===selectedClubId,upsetGap=winner&&loser?loser.reputation-winner.reputation:0,leaderLost=Boolean(leaderClub&&loser?.id===leaderClub.id),classic=home.reputation>=78&&away.reputation>=78;
   const relevance=28+(isHeadline?22:0)+(isSelected?16:0)+(m>=3?20:0)+(m>=5?10:0)+(upsetGap>=8?24:0)+(leaderLost?18:0)+(classic?12:0)+(goalsInMatch>=6?8:0)+latestBoost;
   if(relevance<58)continue;
   let title:string,tone:NewsEngineTone="neutral";const tags:string[]=[competition.id];
   if(m>=4&&winner&&loser){title=`${winner.name} atropela ${loser.name} em goleada`;tone="positive";tags.push("goleada");}
   else if(upsetGap>=8&&winner&&loser){title=`Zebra: ${winner.name} derruba ${loser.name}`;tone="positive";tags.push("zebra");}
   else if(leaderLost&&winner&&loser){title=`Líder tropeça: ${winner.name} vence ${loser.name}`;tone="negative";tags.push("liderança");}
   else if(isDraw(fixture)&&classic){title=`Clássico termina empatado: ${home.name} ${score(fixture)} ${away.name}`;tags.push("clássico");}
   else if(winner&&loser){title=`${winner.name} vence ${loser.name} por ${score(fixture)}`;tone=loser.id===selectedClubId?"negative":"positive";}
   else{title=`${home.name} e ${away.name} ficam no empate`;}
   out.push({id:`match-${competition.id}-${fixture.id}`,title,summary:`${home.name} ${score(fixture)} ${away.name}, pela rodada ${round} do ${competition.name}.${m>=3?` A diferença de ${m} gols colocou o resultado entre os destaques da rodada.`:""}${upsetGap>=8&&winner&&loser?` O resultado contrariou a diferença de reputação entre as equipes.`:""}`,source:isHeadline?"Central do Futebol • V90":"Futebol Agora • V90",meta:`${competition.shortName} • R${round}`,round,tone,relevance:Math.min(100,relevance),tags});
  }
 }

 for(const club of reputations.slice(0,8)){
  const recent=played.filter(f=>f.homeClubId===club.id||f.awayClubId===club.id).sort((a,b)=>b.round-a.round).slice(0,4),form=recent.map(f=>clubResult(f,club.id));
  if(form.length>=3&&form.slice(0,3).every(r=>r==="D"))out.push({id:`crisis-${club.id}-${recent[0]?.round}`,title:`Crise acende alerta no ${club.name}`,summary:`O ${club.name} perdeu seus últimos três jogos de liga. A sequência aumenta a pressão sobre elenco e comissão técnica.`,source:"Radar dos Clubes • V90",meta:`${competition.shortName} • Momento`,round:recent[0]?.round??latestRound,tone:"negative",relevance:90,tags:["crise","sequência"]});
  else if(form.length>=3&&form.slice(0,3).every(r=>r==="V"))out.push({id:`streak-${club.id}-${recent[0]?.round}`,title:`${club.name} embala com três vitórias seguidas`,summary:`A sequência coloca o ${club.name} entre os times mais quentes do momento no ${competition.name}.`,source:"Radar dos Clubes • V90",meta:`${competition.shortName} • Momento`,round:recent[0]?.round??latestRound,tone:"positive",relevance:84,tags:["boa fase","sequência"]});
 }

 if(leaderClub&&latestRound>0)out.push({id:`table-leader-${competition.id}-${latestRound}`,title:`${leaderClub.name} lidera o ${competition.shortName}`,summary:`Após ${latestRound} rodada${latestRound===1?"":"s"} disputada${latestRound===1?"":"s"}, o ${leaderClub.name} soma ${leader.points} pontos. ${standings[1]?`O ${clubs.get(standings[1].clubId)?.name??"vice-líder"} aparece logo atrás com ${standings[1].points}.`:""}`,source:"Classificação V90",meta:`${competition.shortName} • Tabela`,round:latestRound,tone:"neutral",relevance:88,tags:["classificação","liderança"]});


 // Ligas paralelas ativas do mundo do save. Cada liga recebe ao menos uma pauta quando houver jogos disputados.
 for(const parallel of Object.values(season.worldLeagues?.leagues??{})){if(!parallel)continue;const pPlayed=parallel.fixtures.filter(f=>f.played&&f.homeGoals!==undefined&&f.awayGoals!==undefined);if(!pPlayed.length)continue;const pLatest=Math.max(...pPlayed.map(f=>f.round)),latest=pPlayed.filter(f=>f.round===pLatest),teams=new Map(parallel.teams.map(t=>[t.id,t])),pGoals=latest.reduce((sum,f)=>sum+totalGoals(f),0),pBig=[...latest].sort((a,b)=>margin(b)-margin(a)||totalGoals(b)-totalGoals(a))[0],leader=[...parallel.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor)[0],leaderTeam=leader?teams.get(leader.clubId):undefined;out.push({id:`parallel-round-${parallel.competitionId}-${pLatest}`,title:`${parallel.shortName}: rodada ${pLatest} termina com ${pGoals} gols`,summary:`Destaque para ${teams.get(pBig.homeClubId)?.name??"Mandante"} ${score(pBig)} ${teams.get(pBig.awayClubId)?.name??"Visitante"}.${leaderTeam?` O ${leaderTeam.name} lidera com ${leader.points} pontos.`:""}`,source:"Giro Internacional • V90",meta:`${parallel.country} • ${parallel.shortName} • R${pLatest}`,round:pLatest,tone:"neutral",relevance:78,tags:[parallel.competitionId,"mundo","resumo da rodada"]});for(const f of latest.filter(f=>margin(f)>=3||totalGoals(f)>=6).slice(0,2)){const h=teams.get(f.homeClubId),a=teams.get(f.awayClubId);out.push({id:`parallel-match-${parallel.competitionId}-${f.id}`,title:`${parallel.shortName}: ${h?.name??"Casa"} ${score(f)} ${a?.name??"Fora"}`,summary:`Um dos resultados de maior impacto da rodada ${pLatest} em ${parallel.country}.`,source:"Placar Global • V90",meta:`${parallel.shortName} • R${pLatest}`,round:pLatest,tone:"neutral",relevance:70+Math.min(18,margin(f)*4),tags:[parallel.competitionId,"placar"]});}}
 // Copas nacionais e continentais ativas, inclusive quando ainda aguardam o primeiro jogo da fase.
 for(const tournament of season.worldCompetitions?.tournaments??[]){const playedCup=tournament.matches.filter(m=>m.played&&m.homeGoals!==undefined&&m.awayGoals!==undefined).sort((a,b)=>b.date.localeCompare(a.date)),latest=playedCup[0];if(latest){const sameStage=playedCup.filter(m=>m.stage===latest.stage&&m.date===latest.date),goals=sameStage.reduce((sum,m)=>sum+(m.homeGoals??0)+(m.awayGoals??0),0);out.push({id:`cup-${tournament.definition.id}-${latest.date}-${latest.stage}`,title:`${tournament.definition.shortName}: ${latest.stage} movimenta o mundo do save`,summary:`${latest.home.name} ${latest.homeGoals}–${latest.awayGoals} ${latest.away.name}.${sameStage.length>1?` A rodada da fase teve ${goals} gols em ${sameStage.length} jogos.`:""}${latest.decidedByPenalties?" A vaga foi decidida nos pênaltis.":""}`,source:"Copas & Continentes • V90",meta:`${tournament.definition.shortName} • ${latest.stage}`,round:latest.roundDue,tone:"neutral",relevance:82,tags:[tournament.definition.id,"copa",tournament.definition.kind]});}else if(!tournament.completed){out.push({id:`cup-preview-${tournament.definition.id}-${tournament.currentStage}`,title:`${tournament.definition.shortName} entra no radar: ${tournament.currentStage}`,summary:`A ${tournament.definition.name} está ativa no calendário do save. A redação acompanha a fase ${tournament.currentStage} e seus próximos confrontos.`,source:"Agenda Mundial • V90",meta:`${tournament.definition.shortName} • Em andamento`,round:season.currentRound,tone:"neutral",relevance:55,tags:[tournament.definition.id,"agenda"]});}}
 return out.sort((a,b)=>b.relevance-a.relevance||b.round-a.round).slice(0,180);
}
