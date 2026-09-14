"use client";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock3, Cpu, Database, Shield, UsersRound } from "lucide-react";
import { DATABASE_STATUS_ROWS, DATABASE_STATUS_SUMMARY, type DatabaseHealthLevel, type DatabaseStatusRow } from "@/data/database-status";
import styles from "./database-status-panel.module.css";

const categories=["Liga profissional","Copa nacional","Estadual","Base","Internacional","Staff"] as const;
const healthLabel:Record<DatabaseHealthLevel,string>={updated:"OK",partial:"Parcial",pending:"Falta",error:"Erro",na:"N/D"};
const healthTitle:Record<DatabaseHealthLevel,string>={updated:"Cobertura validada",partial:"Cobertura parcial",pending:"Ainda não disponível",error:"Erro detectado",na:"Não se aplica"};

function Health({level,detail}:{level:DatabaseHealthLevel;detail?:string}){return <span className={`${styles.health} ${styles[level]}`} title={detail??healthTitle[level]}>{level==="updated"?<CheckCircle2/>:level==="partial"?<Clock3/>:level==="na"?<span className={styles.naDot}>—</span>:<AlertTriangle/>}<b>{healthLabel[level]}</b></span>}
function qualityClass(score:number){return score>=80?styles.qualityGood:score>=50?styles.qualityWarn:styles.qualityBad}
function clubText(row:DatabaseStatusRow){return row.expectedClubs&&row.expectedClubs!==row.clubs?`${row.clubs}/${row.expectedClubs}`:String(row.clubs||"—")}

export default function DatabaseStatusPanel(){
 return <section className={styles.panel}>
  <header className={styles.header}>
   <div><Database/><span><b>SAÚDE DA BASE DE DADOS</b><small>Auditoria por dimensão: calendário, motor, clubes, elencos e escudos.</small></span></div>
   <em><Activity/> Auditoria diária • 19h</em>
  </header>

  <div className={styles.summary}>
   <Metric icon={<CheckCircle2/>} value={`${DATABASE_STATUS_SUMMARY.healthy}/${DATABASE_STATUS_SUMMARY.total}`} label="SAUDÁVEIS"/>
   <Metric icon={<Clock3/>} value={String(DATABASE_STATUS_SUMMARY.attention)} label="ATENÇÃO"/>
   <Metric icon={<AlertTriangle/>} value={String(DATABASE_STATUS_SUMMARY.critical)} label="CRÍTICAS"/>
   <Metric icon={<Shield/>} value={DATABASE_STATUS_SUMMARY.clubs.toLocaleString("pt-BR")} label="CLUBES MAPEADOS"/>
   <Metric icon={<UsersRound/>} value={DATABASE_STATUS_SUMMARY.players.toLocaleString("pt-BR")} label="JOGADORES"/>
   <Metric icon={<AlertTriangle/>} value={String(DATABASE_STATUS_SUMMARY.alerts)} label="ALERTAS"/>
  </div>

  <div className={styles.integrityStrip}>
   <span><b>{DATABASE_STATUS_SUMMARY.shortRosters}</b> elencos abaixo de 18</span>
   <span><b>{DATABASE_STATUS_SUMMARY.missingCrests}</b> clubes sem escudo</span>
   <span><b>{DATABASE_STATUS_SUMMARY.suspiciousPlayers}</b> registros suspeitos</span>
   <small>“Falta” não significa que a competição não existe: indica que aquela dimensão ainda não está validada na base real.</small>
  </div>

  {categories.map(category=>{
   const rows=DATABASE_STATUS_ROWS.filter(row=>row.category===category).sort((a,b)=>a.qualityScore-b.qualityScore||a.name.localeCompare(b.name));
   if(!rows.length)return null;
   return <div className={styles.section} key={category}>
    <div className={styles.sectionTitle}><h4>{category.toUpperCase()}</h4><span>{rows.filter(r=>r.qualityScore>=80&&r.status!=="error").length}/{rows.length} saudáveis</span></div>
    <div className={styles.table}>
     <div className={styles.tableHead}><span>COMPETIÇÃO</span><span><CalendarDays/> CALENDÁRIO</span><span><Cpu/> MOTOR</span><span>CLUBES</span><span>ELENCOS</span><span>ESCUDOS</span><span>QUALIDADE</span><span>ALERTAS</span></div>
     {rows.map(row=><article key={`${category}-${row.id}`} className={styles.row}>
      <div className={styles.competition}><b>{row.name}</b><small>{row.country} • snapshot {row.snapshot||"—"}</small>{row.note?<small className={styles.note}>{row.note}</small>:null}</div>
      <Health level={row.calendarStatus}/>
      <Health level={row.engineStatus}/>
      <div className={styles.dimension}><Health level={row.clubStatus}/><small>{clubText(row)}</small></div>
      <div className={styles.dimension}><Health level={row.rosterStatus}/><small>{row.clubs?`${row.healthyRosterClubs}/${row.clubs} ≥18`:"—"}</small></div>
      <div className={styles.dimension}><Health level={row.crestStatus}/><small>{row.clubs?`${row.crestCoverage}%`:"—"}</small></div>
      <div className={styles.quality}><div className={styles.qualityTop}><b>{row.qualityScore}%</b><span>{row.qualityScore>=80?"Saudável":row.qualityScore>=50?"Atenção":"Crítica"}</span></div><div className={styles.qualityTrack}><i className={qualityClass(row.qualityScore)} style={{width:`${row.qualityScore}%`}}/></div></div>
      <div className={styles.alertCell}>{row.alerts.length?<span className={styles.alertBadge} title={row.alerts.map(item=>item.message).join(" • ")}><AlertTriangle/>{row.alerts.length}</span>:<span className={styles.cleanBadge}><CheckCircle2/>0</span>}<small>{row.alerts[0]?.message??"Sem alertas"}</small></div>
     </article>)}
    </div>
   </div>
  })}
 </section>;
}

function Metric({icon,value,label}:{icon:ReactNode;value:string;label:string}){return <div className={styles.metric}>{icon}<span><b>{value}</b><small>{label}</small></span></div>}
