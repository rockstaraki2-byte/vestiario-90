"use client";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, Image, Shield, UsersRound } from "lucide-react";
import { DATABASE_STATUS_ROWS, DATABASE_STATUS_SUMMARY, type DatabaseStatusLevel } from "@/data/database-status";
import styles from "./database-status-panel.module.css";

const label:Record<DatabaseStatusLevel,string>={updated:"Atualizada",partial:"Parcial",pending:"Pendente",error:"Erro"};
const icon=(status:DatabaseStatusLevel)=>status==="updated"?<CheckCircle2/>:status==="partial"?<Clock3/>:<AlertTriangle/>;
const categories=["Liga profissional","Base","Internacional","Estadual","Staff"] as const;

export default function DatabaseStatusPanel(){
 return <section className={styles.panel}>
  <header className={styles.header}><div><Database/><span><b>STATUS DA BASE DE DADOS</b><small>Snapshot real utilizado por novos saves. Saves existentes preservam a própria história.</small></span></div><em>Atualização diária • 19h</em></header>
  <div className={styles.summary}>
   <Metric icon={<CheckCircle2/>} value={`${DATABASE_STATUS_SUMMARY.updated}/${DATABASE_STATUS_SUMMARY.total}`} label="ATUALIZADAS"/>
   <Metric icon={<Clock3/>} value={String(DATABASE_STATUS_SUMMARY.partial)} label="PARCIAIS"/>
   <Metric icon={<AlertTriangle/>} value={String(DATABASE_STATUS_SUMMARY.pending+DATABASE_STATUS_SUMMARY.error)} label="PENDENTES"/>
   <Metric icon={<Shield/>} value={DATABASE_STATUS_SUMMARY.clubs.toLocaleString("pt-BR")} label="CLUBES MAPEADOS"/>
   <Metric icon={<UsersRound/>} value={DATABASE_STATUS_SUMMARY.players.toLocaleString("pt-BR")} label="JOGADORES"/>
  </div>
  {categories.map(category=>{const rows=DATABASE_STATUS_ROWS.filter(row=>row.category===category);if(!rows.length)return null;return <div className={styles.section} key={category}><h4>{category.toUpperCase()}</h4><div className={styles.table}><div className={styles.tableHead}><span>COMPETIÇÃO</span><span>STATUS</span><span>CLUBES</span><span>JOGADORES</span><span>FOTOS</span><span>ESCUDOS</span><span>SNAPSHOT</span></div>{rows.map(row=><article key={`${category}-${row.id}`} className={styles.row}><div><b>{row.name}</b><small>{row.country}{row.note?` • ${row.note}`:""}</small></div><span className={`${styles.status} ${styles[row.status]}`}>{icon(row.status)} {label[row.status]}</span><strong>{row.clubs||"—"}</strong><strong>{row.players||"—"}</strong><strong><Image/>{row.photoCoverage?`${row.photoCoverage}%`:"—"}</strong><strong>{row.crestCoverage?`${row.crestCoverage}%`:"—"}</strong><time>{row.snapshot||"—"}</time></article>)}</div></div>})}
 </section>;
}
function Metric({icon,value,label}:{icon:ReactNode;value:string;label:string}){return <div className={styles.metric}>{icon}<span><b>{value}</b><small>{label}</small></span></div>}
