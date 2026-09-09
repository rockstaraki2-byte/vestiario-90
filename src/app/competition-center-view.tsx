"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Shield, Trophy } from "lucide-react";
import { professionalCompetitionById } from "@/data/brazil-2026/competitions";
import { sortedStandings } from "@/game-engine/league";
import { aggregateScoreForMatch, type WorldCompetitionMatch, type WorldTournamentState } from "@/game-engine/world-competitions";
import type { SeasonState } from "@/game-engine/season";
import { aggregateLabel, competitionTable, focusGroupForTournament, tieMatches, userTournamentStages } from "./competition-view-model";
import styles from "./competition-center-view.module.css";

type Tab={id:string;label:string;kind:"league"|"cup";tournament?:WorldTournamentState};

export default function CompetitionCenterView({season}:{season:SeasonState}){
 const club=season.league.clubs.find(item=>item.id===season.selectedClubId)??season.league.clubs[0],leagueDef=professionalCompetitionById(season.competitionId),[selected,setSelected]=useState("league"),[stageByCompetition,setStageByCompetition]=useState<Record<string,string>>({});
 const tabs=useMemo<Tab[]>(()=>{
  const involved=season.worldCompetitions.tournaments.filter(tournament=>tournament.participants.some(participant=>participant.activeClubId===club.id)||tournament.matches.some(match=>match.home.activeClubId===club.id||match.away.activeClubId===club.id));
  return[{id:"league",label:leagueDef.shortName??leagueDef.name,kind:"league"},...involved.map(tournament=>({id:tournament.definition.id,label:tournament.definition.shortName,kind:"cup" as const,tournament}))];
 },[season.worldCompetitions.tournaments,club.id,leagueDef.name,leagueDef.shortName]);
 const active=tabs.find(tab=>tab.id===selected)??tabs[0];
 return <div className={styles.shell}>
  <section className={styles.hero}><div><span>CENTRAL DE COMPETIÇÕES • {season.year}</span><h2>Classificações, resultados e mata-matas</h2><p>Acompanhe liga e copas no mesmo lugar. Em confrontos de ida e volta, o placar agregado permanece visível durante toda a eliminatória.</p></div><Trophy/></section>
  <div className={styles.tabs}>{tabs.map(tab=><button key={tab.id} className={active.id===tab.id?styles.activeTab:""} onClick={()=>setSelected(tab.id)}>{tab.kind==="league"?<Shield/>:<Trophy/>}{tab.label}</button>)}</div>
  {active.kind==="league"?<LeaguePanel season={season}/>:active.tournament?<TournamentPanel season={season} tournament={active.tournament} stage={stageByCompetition[active.id]} onStage={stage=>setStageByCompetition(current=>({...current,[active.id]:stage}))}/>:null}
 </div>;
}

function LeaguePanel({season}:{season:SeasonState}){
 const club=season.league.clubs.find(item=>item.id===season.selectedClubId)??season.league.clubs[0],standings=sortedStandings(season.league),competition=professionalCompetitionById(season.competitionId),fixtures=[...season.league.fixtures].filter(item=>item.played||item.date>=season.currentDate).sort((a,b)=>a.date.localeCompare(b.date)||a.round-b.round),currentIndex=Math.max(0,fixtures.findIndex(item=>!item.played&&item.date>=season.currentDate)),sliceStart=Math.max(0,currentIndex-10),visible=fixtures.slice(sliceStart,sliceStart+20);
 return <div className={styles.layout}>
  <section className={styles.panel}><header><BarChart3/><div><span>CLASSIFICAÇÃO</span><b>{competition.name}</b></div></header><div className={styles.table}><div className={styles.tableHead}><i>#</i><span>Clube</span><small>J</small><small>SG</small><strong>PTS</strong></div>{standings.map((standing,index)=>{const rowClub=season.league.clubs.find(item=>item.id===standing.clubId);return <article key={standing.clubId} className={standing.clubId===club.id?styles.userRow:""}><i>{index+1}</i><span>{rowClub?.shortName??rowClub?.name}</span><small>{standing.played}</small><small>{standing.goalsFor-standing.goalsAgainst}</small><strong>{standing.points}</strong></article>})}</div></section>
  <section className={styles.panel}><header><CalendarDays/><div><span>RESULTADOS E AGENDA</span><b>Rodadas do campeonato</b></div></header><div className={styles.results}>{visible.map(fixture=>{const home=season.league.clubs.find(item=>item.id===fixture.homeClubId),away=season.league.clubs.find(item=>item.id===fixture.awayClubId),mine=fixture.homeClubId===club.id||fixture.awayClubId===club.id;return <article key={fixture.id} className={mine?styles.userResult:""}><time>R{fixture.round} • {dateLabel(fixture.date)}</time><div><span>{home?.shortName??home?.name}</span><strong>{fixture.played?`${fixture.homeGoals??0}–${fixture.awayGoals??0}`:"×"}</strong><span>{away?.shortName??away?.name}</span></div><small>{fixture.played?"Final":"Agendado"}</small></article>})}</div></section>
 </div>;
}

function TournamentPanel({season,tournament,stage,onStage}:{season:SeasonState;tournament:WorldTournamentState;stage?:string;onStage:(stage:string)=>void}){
 const clubId=season.selectedClubId,stages=userTournamentStages(tournament,clubId),fallback=latestRelevantStage(tournament,clubId),activeStage=stage&&stages.includes(stage)?stage:fallback,stageMatches=tournament.matches.filter(match=>match.stage===activeStage).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),tableStage=stageMatches.some(match=>match.tableStage),rows=tableStage?competitionTable(tournament,activeStage,clubId):[],group=tableStage?focusGroupForTournament(tournament,activeStage,clubId):undefined,ties=tableStage?[]:groupTies(stageMatches),userParticipant=tournament.participants.find(participant=>participant.activeClubId===clubId);
 return <div className={styles.tournament}>
  <section className={styles.competitionHead}><div><span>{tournament.definition.kind.toUpperCase()}</span><h3>{tournament.definition.name}</h3><p>{tournament.definition.rulesSummary}</p></div><div><small>FASE ATUAL</small><b>{tournament.currentStage}</b><em>{tournament.completed?"ENCERRADA":"EM ANDAMENTO"}</em></div></section>
  <div className={styles.stageTabs}>{stages.map(item=><button key={item} className={item===activeStage?styles.stageActive:""} onClick={()=>onStage(item)}>{item}</button>)}</div>
  <div className={styles.layout}>
   {tableStage?<section className={styles.panel}><header><BarChart3/><div><span>CLASSIFICAÇÃO{group?` • GRUPO ${group}`:""}</span><b>{activeStage}</b></div></header><div className={styles.table}><div className={styles.tableHead}><i>#</i><span>Clube</span><small>J</small><small>SG</small><strong>PTS</strong></div>{rows.map((row,index)=><article key={row.participant.id} className={row.participant.activeClubId===clubId?styles.userRow:""}><i>{index+1}</i><span>{row.participant.shortName||row.participant.name}</span><small>{row.played}</small><small>{row.goalDifference}</small><strong>{row.points}</strong></article>)}</div></section>:<section className={styles.panel}><header><Trophy/><div><span>CHAVE ELIMINATÓRIA</span><b>{activeStage}</b></div></header><div className={styles.ties}>{ties.length?ties.map(tie=><TieCard key={tie[0].tieId??tie[0].id} tournament={tournament} matches={tie} clubId={clubId}/>):<div className={styles.empty}>Os confrontos desta fase ainda serão definidos.</div>}</div></section>}
   <section className={styles.panel}><header><CalendarDays/><div><span>RESULTADOS DA COMPETIÇÃO</span><b>{activeStage}</b></div></header><div className={styles.results}>{stageMatches.map(match=><CompetitionResult key={match.id} tournament={tournament} match={match} clubId={clubId}/>)}</div></section>
  </div>
  {userParticipant&&<section className={styles.userStatus}><Trophy/><div><span>SEU CLUBE NA COMPETIÇÃO</span><b>{userParticipant.name}</b><small>{userCompetitionStatus(tournament,userParticipant.id)}</small></div></section>}
 </div>;
}

function TieCard({tournament,matches,clubId}:{tournament:WorldTournamentState;matches:WorldCompetitionMatch[];clubId:string}){
 const played=matches.filter(match=>match.played),reference=played[played.length-1]??matches[matches.length-1],aggregate=aggregateScoreForMatch(tournament,reference),mine=matches.some(match=>match.home.activeClubId===clubId||match.away.activeClubId===clubId),first=matches[0],home=first.home,away=first.away;
 const totalHome=aggregate?sumForParticipant(played,home.id):undefined,totalAway=aggregate?sumForParticipant(played,away.id):undefined;
 return <article className={`${styles.tie} ${mine?styles.userTie:""}`}><div><b>{home.shortName||home.name}</b><span>×</span><b>{away.shortName||away.name}</b></div><section>{matches.map(match=><small key={match.id}>{match.leg?`${match.leg}º jogo • `:""}{dateLabel(match.date)} • {match.played?`${match.home.shortName} ${match.homeGoals??0}–${match.awayGoals??0} ${match.away.shortName}`:"Agendado"}</small>)}</section>{aggregate&&aggregate.legsPlayed>0?<strong>{aggregate.legsPlayed<aggregate.legsTotal?"AGREGADO PARCIAL":"AGREGADO"} {totalHome}–{totalAway}{aggregate.decidedByPenalties?" • PÊNALTIS":""}</strong>:<em>Confronto definido</em>}</article>;
}

function CompetitionResult({tournament,match,clubId}:{tournament:WorldTournamentState;match:WorldCompetitionMatch;clubId:string}){
 const mine=match.home.activeClubId===clubId||match.away.activeClubId===clubId,label=aggregateLabel(tournament,match);
 return <article className={mine?styles.userResult:""}><time>{dateLabel(match.date)}{match.matchday?` • J${match.matchday}`:match.leg?` • ${match.leg}º jogo`:""}</time><div><span>{match.home.shortName||match.home.name}</span><strong>{match.played?`${match.homeGoals??0}–${match.awayGoals??0}`:"×"}</strong><span>{match.away.shortName||match.away.name}</span></div><small>{match.played?(match.decidedByPenalties?"Final • pênaltis":"Final"):"Agendado"}</small>{label&&<em>{label}</em>}</article>;
}

function groupTies(matches:WorldCompetitionMatch[]){const map=new Map<string,WorldCompetitionMatch[]>();for(const match of matches){const key=match.tieId??match.id;map.set(key,[...(map.get(key)??[]),match])}return[...map.values()].map(items=>items.sort((a,b)=>(a.leg??1)-(b.leg??1)));}
function latestRelevantStage(tournament:WorldTournamentState,clubId:string){const participant=tournament.participants.find(item=>item.activeClubId===clubId),played=tournament.matches.filter(match=>participant&&(match.home.id===participant.id||match.away.id===participant.id)&&match.played).sort((a,b)=>b.date.localeCompare(a.date));return played[0]?.stage??tournament.currentStage;}
function sumForParticipant(matches:WorldCompetitionMatch[],participantId:string){return matches.reduce((sum,match)=>sum+(match.home.id===participantId?(match.homeGoals??0):match.away.id===participantId?(match.awayGoals??0):0),0);}
function userCompetitionStatus(tournament:WorldTournamentState,participantId:string){if(tournament.championId===participantId)return"Campeão";const userMatches=tournament.matches.filter(match=>match.home.id===participantId||match.away.id===participantId),last=[...userMatches].filter(match=>match.played).sort((a,b)=>b.date.localeCompare(a.date))[0];if(!last)return`Aguardando estreia • ${tournament.currentStage}`;if(last.winnerId&&last.winnerId!==participantId&&!last.tableStage)return`Eliminado • ${last.stage}`;return`Em disputa • ${tournament.currentStage}`;}
function dateLabel(iso:string){return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",timeZone:"UTC"}).format(new Date(`${iso}T12:00:00Z`));}
