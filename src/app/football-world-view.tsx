"use client";

import { useState } from "react";
import { BadgeCheck, CalendarRange, ChevronRight, Globe2, Shield, Trophy, UserRoundCog } from "lucide-react";
import type { SeasonState } from "@/game-engine/season";
import { managerForClub } from "@/game-engine/club-ai";
import { userWorldCompetitionMatches } from "@/game-engine/world-competitions";
import styles from "./football-world-view.module.css";

type Tab="Competições"|"Técnicos";
export default function FootballWorldView({season}:{season:SeasonState}){
 const[tab,setTab]=useState<Tab>("Competições"),club=season.league.clubs.find(c=>c.id===season.selectedClubId)!,world=season.worldCompetitions,ai=season.clubAi,userCupMatches=userWorldCompetitionMatches(world,club.id),manager=managerForClub(ai,club.id);
 return <div className={styles.shell}>
  <section className={styles.hero}><div><span>MUNDO DO FUTEBOL</span><h2>O campeonato não acontece sozinho</h2><p>Copas, torneios continentais, técnicos, demissões e mudanças de estilo continuam evoluindo junto com a sua carreira.</p></div><div className={styles.heroStat}><Globe2/><div><small>COMPETIÇÕES ATIVAS</small><b>{world.tournaments.filter(t=>!t.completed).length}</b></div></div></section>
  <nav className={styles.tabs}>{(["Competições","Técnicos"] as const).map(item=><button key={item} className={tab===item?styles.active:""} onClick={()=>setTab(item)}>{item==="Competições"?<Trophy/>:<UserRoundCog/>}{item}</button>)}</nav>
  {tab==="Competições"&&<div className={styles.grid}>
   <section className={styles.panel}><header><div><span>SEU CLUBE NAS COPAS</span><h3>{userCupMatches.length} compromisso{userCupMatches.length===1?"":"s"} no mundo do save</h3></div><CalendarRange/></header><div className={styles.cupList}>{userCupMatches.length?userCupMatches.slice(0,16).map(({tournament,match})=><article key={match.id}><div><b>{tournament.definition.shortName}</b><small>{match.stage} • rodada-base {match.roundDue}</small></div><div className={styles.score}><span>{match.home.shortName}</span><strong>{match.played?`${match.homeGoals} × ${match.awayGoals}`:"×"}</strong><span>{match.away.shortName}</span></div><em>{match.played?(match.winnerId===`active:${club.id}`?"Classificado":"Eliminado"):"Agendado"}</em></article>):<Empty text="Seu clube não está classificado para uma competição paralela neste momento."/>}</div></section>
   <section className={styles.panel}><header><div><span>TORNEIOS</span><h3>Copas nacionais e continentais</h3></div><Trophy/></header><div className={styles.tournaments}>{world.tournaments.map(t=><article key={t.definition.id}><div><i><Shield/></i><div><b>{t.definition.name}</b><span>{t.definition.kind} • {t.participants.length} participantes</span></div></div><div className={styles.tournamentMeta}><small>{t.completed?"CAMPEÃO":"FASE ATUAL"}</small><strong>{t.completed?world.history.find(h=>h.year===world.season&&h.competitionId===t.definition.id)?.championName??"Definido":t.currentStage}</strong></div></article>)}</div></section>
   <section className={`${styles.panel} ${styles.wide}`}><header><div><span>HISTÓRICO DE CAMPEÕES</span><h3>Memória do mundo</h3></div><BadgeCheck/></header><div className={styles.history}>{world.history.length?world.history.slice(0,30).map(item=><article key={`${item.year}-${item.competitionId}`}><b>{item.year}</b><span>{item.competitionName}</span><strong>{item.championName}</strong></article>):<Empty text="Os campeões aparecerão conforme as competições forem concluídas."/>}</div></section>
  </div>}
  {tab==="Técnicos"&&<div className={styles.grid}>
   <section className={styles.panel}><header><div><span>SEU CLUBE</span><h3>{manager?.managerName??"Treinador"}</h3></div><UserRoundCog/></header>{manager&&<div className={styles.managerCard}><div><small>ESTILO</small><b>{manager.style}</b></div><div><small>FORMAÇÃO</small><b>{manager.formation}</b></div><div><small>SEGURANÇA</small><b>{manager.jobSecurity}%</b></div><div><small>BASE</small><b>{manager.youthTrust}</b></div><div><small>MERCADO</small><b>{manager.transferAggression}</b></div><div><small>PACIÊNCIA</small><b>{manager.patience}</b></div></div>}</section>
   <section className={styles.panel}><header><div><span>MERCADO DE TÉCNICOS</span><h3>{ai.history.length} mudança{ai.history.length===1?"":"s"} registrada{ai.history.length===1?"":"s"}</h3></div><ChevronRight/></header><div className={styles.moves}>{ai.history.length?ai.history.slice(0,18).map(move=><article key={move.id}><b>{move.clubName}</b><span>{move.oldManager} → {move.newManager}</span><small>R{move.round} • {move.reason}</small></article>):<Empty text="Nenhum clube trocou de treinador ainda."/>}</div></section>
   <section className={`${styles.panel} ${styles.wide}`}><header><div><span>TÉCNICOS DA LIGA</span><h3>Identidades táticas e pressão por resultados</h3></div><UserRoundCog/></header><div className={styles.managerTable}>{[...ai.managers].sort((a,b)=>a.jobSecurity-b.jobSecurity).map(item=>{const owner=season.league.clubs.find(c=>c.id===item.clubId);return <article key={item.clubId}><div><b>{owner?.name}</b><span>{item.managerName}</span></div><em>{item.style}</em><span>{item.formation}</span><strong className={item.jobSecurity<35?styles.risk:""}>{item.jobSecurity}%</strong></article>})}</div></section>
  </div>}
 </div>
}
function Empty({text}:{text:string}){return <div className={styles.empty}><Globe2/><b>Mundo em movimento</b><p>{text}</p></div>}
