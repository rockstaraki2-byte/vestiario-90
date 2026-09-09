"use client";
import { AlertTriangle, Flag, PlaneTakeoff, Search, ShieldCheck, Star, Trophy, UserCheck, UserMinus } from "lucide-react";
import type { SeasonState } from "@/game-engine/season";
import { nationalSelectionIssues, nationalVacancies, nextNationalFixture, todayNationalFixture } from "@/game-engine/national-team";
import WorldCupWorldPanel from "./world-cup-world-panel";
import styles from "./national-team-view.module.css";

export default function NationalTeamView({season,onApply,onToggle,onLineup,onPlay,onResign}:{season:SeasonState;onApply:(teamId:string)=>void;onToggle:(playerId:string)=>void;onLineup:(playerId:string)=>void;onPlay:()=>void;onResign:()=>void}){
 const career=season.nationalCareer,managerRep=season.livingWorld.managerReputation;
 if(!career||career.status==="Sem seleção"){
  const vacancies=nationalVacancies(career,managerRep);
  return <div className={styles.shell}>
   <section className={styles.hero}><div><span>CARREIRA INTERNACIONAL</span><h2>Seleções também fazem parte da sua trajetória</h2><p>Federações avaliam reputação e momento. Mesmo sem comandar uma seleção, o futebol internacional continua acontecendo no mundo do save.</p></div><Flag/></section>
   <WorldCupWorldPanel season={season}/>
   <section className={styles.panel}><header><div><span>VAGAS E PROJETOS</span><h3>Federações que podem considerar seu currículo</h3></div><Search/></header><div className={styles.jobs}>{vacancies.map(team=>{const invited=career?.offers.some(o=>o.teamId===team.id);return <article key={team.id}><div><b>{team.name}</b><span>{team.confederation} • reputação {team.reputation}</span><small>{invited?"Convite/sondagem ativa":"Manifestação de interesse possível"}</small></div><em>{invited?"CONVITE":"DISPONÍVEL"}</em><button onClick={()=>onApply(team.id)}>MANIFESTAR INTERESSE</button></article>})}</div></section>
  </div>;
 }
 const next=nextNationalFixture(career,season.currentDate),due=todayNationalFixture(career,season.currentDate),selected=new Set(career.squadIds),xi=new Set(career.lineupIds),issues=nationalSelectionIssues(career);
 return <div className={styles.shell}>
  <section className={styles.hero}><div><span>SELEÇÃO NACIONAL</span><h2>{career.teamName}</h2><p>Calendário internacional independente, amistosos, competições oficiais e convocação própria.</p></div><div className={styles.heroStats}><div><small>CONVOCADOS</small><b>{career.squadIds.length}/26</b></div><div><small>XI INICIAL</small><b>{career.lineupIds.length}/11</b></div><div><small>PRÓXIMO JOGO</small><b>{next?.date??"—"}</b></div></div></section>
  <WorldCupWorldPanel season={season}/>
  {due&&<section className={styles.matchday}><Flag/><div><span>{due.competition} • {due.stage}</span><h3>{due.homeName} × {due.awayName}</h3><p>{due.date<season.currentDate?`Compromisso pendente desde ${due.date}. `:""}Convocação e XI precisam estar válidos antes de jogar.</p></div><button disabled={issues.some(i=>i.includes("incompleta")||i.includes("XI")||i.includes("precisa ter"))} onClick={onPlay}><PlaneTakeoff/> JOGAR PARTIDA</button></section>}
  {issues.length>0&&<section className={styles.warnings}><AlertTriangle/>{issues.map(i=><span key={i}>{i}</span>)}</section>}
  <div className={styles.grid}>
   <section className={styles.panel}><header><div><span>COMPETIÇÕES</span><h3>Situação internacional</h3></div><Trophy/></header><div className={styles.status}>{(career.competitionStatus??[]).length?(career.competitionStatus??[]).map(s=><article key={s.competition}><div><b>{s.competition}</b><span>{s.stage} • {s.status}</span></div><strong>{s.points} pts</strong><small>{s.played}J • {s.goalsFor}–{s.goalsAgainst}</small><p>{s.note}</p></article>):<p className={styles.empty}>Sem competição oficial ativa nesta temporada.</p>}</div><header className={styles.subhead}><div><span>CALENDÁRIO</span><h3>Compromissos internacionais</h3></div></header><div className={styles.fixtures}>{career.fixtures.map(f=><article key={f.id} className={f.id===due?.id?styles.today:""}><time>{f.date}</time><div><b>{f.homeName} × {f.awayName}</b><span>{f.competition} • {f.stage}{f.leg?` • jogo ${f.leg}`:""}</span></div><strong>{f.played?`${f.homeGoals} × ${f.awayGoals}${f.decidedByPenalties?" (p)":""}`:"Agendado"}</strong></article>)}</div></section>
   <section className={styles.panel}><header><div><span>HISTÓRICO</span><h3>Seu trabalho internacional</h3></div><ShieldCheck/></header><div className={styles.history}>{career.history.length?career.history.map(h=><article key={h.id}><b className={styles[h.result]}>{h.result}</b><div><strong>{h.score} vs {h.opponent}</strong><span>{h.competition} • {h.stage} • {h.date}</span></div></article>):<p className={styles.empty}>Nenhum jogo disputado ainda.</p>}</div><button className={styles.resign} onClick={onResign}>DEIXAR A SELEÇÃO</button></section>
  </div>
  <section className={styles.panel}><header><div><span>CONVOCAÇÃO & XI</span><h3>26 convocados • 11 titulares</h3></div><UserCheck/></header><p className={styles.info}>Convocados e titulares são independentes do clube. O motor usa exatamente o XI selecionado para calcular a força da seleção.</p><div className={styles.pool}>{career.pool.map(player=><article key={player.id} className={xi.has(player.id)?styles.starting:""}><div><b>{player.name}</b><span>{player.clubName} • {player.position} • {player.age} anos</span></div><strong>OVR {player.overall}</strong><em>{player.virtual?"EXTERIOR":"BASE DO SAVE"}</em><div className={styles.playerActions}><button className={selected.has(player.id)?styles.cut:""} onClick={()=>onToggle(player.id)}>{selected.has(player.id)?<><UserMinus/> CORTAR</>:<><UserCheck/> CONVOCAR</>}</button>{selected.has(player.id)&&<button className={xi.has(player.id)?styles.xiActive:""} onClick={()=>onLineup(player.id)}><Star/>{xi.has(player.id)?"XI":"TITULAR"}</button>}</div></article>)}</div></section>
 </div>;
}
