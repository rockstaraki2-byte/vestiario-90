"use client";

import { CalendarDays, Trophy } from "lucide-react";
import type { SeasonState } from "@/game-engine/season";
import { worldCupSnapshot } from "@/game-engine/international-world";
import styles from "./football-world-view.module.css";

export default function WorldCupWorldPanel({season}:{season:SeasonState}){
 const snapshot=worldCupSnapshot(season.year,season.baseSeed,season.currentDate);
 const played=[...snapshot.matches].filter(match=>match.played).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,14);
 const upcoming=snapshot.matches.filter(match=>!match.played&&match.date>=season.currentDate).slice(0,12);
 return <section className={`${styles.panel} ${styles.wide}`}>
  <header><div><span>COPA DO MUNDO FIFA {season.year}</span><h3>{snapshot.championName?`${snapshot.championName} • campeão mundial`:snapshot.currentStage}</h3></div><Trophy/></header>
  <p className={styles.managerNote}>A competição internacional é reconstruída pela data do save. Isso também vale para carreiras criadas antes desta atualização: jogos já passados recebem resultados, tabelas e mata-mata automaticamente.</p>
  <div className={styles.groupGrid}>{Object.entries(snapshot.groupTables).map(([group,rows])=><article key={group}><b>GRUPO {group}</b>{rows.map(row=><span key={row.teamId}><i>{row.position}</i><strong>{row.teamName}</strong><small>{row.played}J • SG {row.goalDifference>=0?"+":""}{row.goalDifference}</small><em>{row.points} pts</em></span>)}</article>)}</div>
  <div className={styles.grid}>
   <section className={styles.panel}><header><div><span>RESULTADOS</span><h3>Últimos jogos de seleções</h3></div><CalendarDays/></header><div className={styles.worldCalendar}>{played.length?played.map(match=><article key={match.id}><div><span>{match.date}</span><small>{match.stage}</small></div><b>{match.homeName}</b><strong>{match.homeGoals} × {match.awayGoals}</strong><b>{match.awayName}</b><em>{match.decidedByPenalties?"PÊNALTIS":"FINAL"}</em></article>):<p className={styles.managerNote}>A Copa ainda não começou.</p>}</div></section>
   <section className={styles.panel}><header><div><span>AGENDA</span><h3>Próximos jogos</h3></div><CalendarDays/></header><div className={styles.worldCalendar}>{upcoming.length?upcoming.map(match=><article key={match.id}><div><span>{match.date}</span><small>{match.stage}</small></div><b>{match.homeName}</b><strong>×</strong><b>{match.awayName}</b><em>AGENDADO</em></article>):<p className={styles.managerNote}>Não há novos jogos programados nesta edição.</p>}</div></section>
  </div>
  {snapshot.knockoutMatches.length>0&&<div className={styles.stageList}><article><b>MATA-MATA</b><span>{snapshot.currentStage}</span><small>{snapshot.championName?`Campeão: ${snapshot.championName}`:"Os confrontos são atualizados conforme os resultados anteriores."}</small></article>{snapshot.knockoutMatches.slice(-16).map(match=><article key={match.id}><b>{match.stage} • {match.date}</b><span>{match.homeName} {match.played?`${match.homeGoals} × ${match.awayGoals}`:"×"} {match.awayName}</span><small>{match.played?(match.decidedByPenalties?"Decidido nos pênaltis":"Encerrado"):"Agendado"}</small></article>)}</div>}
 </section>;
}
