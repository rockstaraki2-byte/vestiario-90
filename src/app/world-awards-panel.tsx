"use client";

import { useMemo, useState } from "react";
import { Award, CalendarRange, Crown, Medal, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import type { ProfessionalCompetitionId } from "@/data/brazil-2026/competitions";
import { buildCompetitionAwards, buildGlobalAwards, type AwardCoach, type AwardPerson, type AwardTeamMember } from "@/game-engine/awards";
import type { SeasonState } from "@/game-engine/season";
import styles from "./world-awards-panel.module.css";

type Period="Rodada"|"Mês"|"Temporada"|"Mundo";

export default function WorldAwardsPanel({season,leagueId,showWorld=true}:{season:SeasonState;leagueId:ProfessionalCompetitionId;showWorld?:boolean}){
 const[period,setPeriod]=useState<Period>("Rodada"),competition=useMemo(()=>buildCompetitionAwards(season,leagueId),[season,leagueId]),global=useMemo(()=>buildGlobalAwards(season),[season]);
 const active:Period=!showWorld&&period==="Mundo"?"Temporada":period;
 const player=active==="Rodada"?competition.playerOfRound:active==="Mês"?competition.playerOfMonth:active==="Temporada"?competition.playerOfSeason:undefined;
 const coach=active==="Rodada"?competition.coachOfRound:active==="Mês"?competition.coachOfMonth:active==="Temporada"?competition.coachOfSeason:undefined;
 const team=active==="Rodada"?competition.teamOfRound:active==="Mês"?competition.teamOfMonth:active==="Temporada"?competition.teamOfSeason:global.worldXI;
 return <section className={styles.shell}>
  <header className={styles.hero}><div><span>PRÊMIOS & RECONHECIMENTO</span><h3>{active==="Mundo"?"Futebol mundial":competition.competitionName}</h3><p>Desempenho, forma, notas e resultados alimentam premiações de rodada, mês e temporada. Enquanto o ano não termina, os prêmios anuais aparecem como projeção.</p></div><Award/></header>
  <nav className={styles.periods}>{(["Rodada","Mês","Temporada",...(showWorld?["Mundo" as const]:[])] as Period[]).map(item=><button key={item} className={active===item?styles.active:""} onClick={()=>setPeriod(item)}>{item==="Rodada"?<CalendarRange/>:item==="Mês"?<Medal/>:item==="Temporada"?<Trophy/>:<Crown/>}{item}</button>)}</nav>
  {active!=="Mundo"?<><div className={styles.featured}><AwardCard label={active==="Rodada"?`JOGADOR DA RODADA ${competition.round||"—"}`:active==="Mês"?"JOGADOR DO MÊS":"JOGADOR DA TEMPORADA"} person={player} icon={<Sparkles/>}/><CoachCard label={active==="Rodada"?"TÉCNICO DA RODADA":active==="Mês"?"TÉCNICO DO MÊS":"TÉCNICO DA TEMPORADA"} coach={coach}/></div><TeamOfPeriod title={active==="Rodada"?"SELEÇÃO DA RODADA":active==="Mês"?"SELEÇÃO DO MÊS":"SELEÇÃO DA TEMPORADA"} team={team}/></>:<GlobalAwards global={global}/>} 
 </section>;
}

function AwardCard({label,person,icon}:{label:string;person?:AwardPerson;icon:React.ReactNode}){return <article className={styles.awardCard}><i>{icon}</i><div><span>{label}</span>{person?<><b>{person.name}</b><small>{person.clubName}{person.position?` • ${person.position}`:""}</small><p>{person.detail}</p></>:<><b>Aguardando jogos</b><small>Sem dados suficientes</small></>}</div></article>}
function CoachCard({label,coach}:{label:string;coach?:AwardCoach}){return <article className={styles.awardCard}><i><ShieldCheck/></i><div><span>{label}</span>{coach?<><b>{coach.name}</b><small>{coach.clubName}</small><p>{coach.detail}</p></>:<><b>Aguardando jogos</b><small>Sem dados suficientes</small></>}</div></article>}
function TeamOfPeriod({title,team}:{title:string;team:AwardTeamMember[]}){return <section className={styles.team}><header><div><span>{title}</span><b>XI escolhido pelo desempenho</b></div><UsersRound/></header>{team.length?<div className={styles.xi}>{team.map((player,index)=><article key={`${player.slot}-${player.id}-${index}`}><em>{player.slot}</em><div><b>{player.name}</b><small>{player.clubName}</small></div><strong>{player.score.toFixed(1)}</strong></article>)}</div>:<div className={styles.empty}>A seleção aparece quando houver jogadores avaliados.</div>}</section>}
function GlobalAwards({global}:{global:ReturnType<typeof buildGlobalAwards>}){return <><div className={styles.globalStatus}><Crown/><div><span>PRÊMIOS GLOBAIS • {global.status.toUpperCase()}</span><b>{global.status==="Oficial"?"Premiações anuais definidas":"Corrida anual em andamento"}</b><p>{global.status==="Oficial"?"A temporada foi encerrada e os vencedores foram consolidados.":"Os nomes abaixo mudam ao longo da temporada conforme forma, notas, produção e protagonismo competitivo."}</p></div></div><div className={styles.globalGrid}><AwardCard label="BALLON D'OR" person={global.ballonDor} icon={<Crown/>}/><AwardCard label="FIFA THE BEST" person={global.fifaBest} icon={<Trophy/>}/><AwardCard label="MELHOR GOLEIRO" person={global.bestGoalkeeper} icon={<ShieldCheck/>}/><AwardCard label="MELHOR JOVEM" person={global.bestYoungPlayer} icon={<Sparkles/>}/></div><TeamOfPeriod title="SELEÇÃO MUNDIAL DO ANO" team={global.worldXI}/></>}
