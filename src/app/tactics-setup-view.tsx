"use client";

import { Play, Shield, SlidersHorizontal, Users } from "lucide-react";
import type { LeagueClub } from "@/game-engine/league";
import type { Formation, MatchTactic, Mentality } from "@/game-engine/match";
import { layoutLineup } from "@/game-engine/tactics-layout";
import styles from "./tactics-setup.module.css";

export default function TacticsSetupView({club,opponent,tactic,onChange,lineupIds,onToggle,onPlay}:{club:LeagueClub;opponent:LeagueClub;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];onToggle:(id:string)=>void;onPlay:()=>void}){
 const starters=lineupIds.map(id=>club.players.find(p=>p.id===id)).filter((p):p is NonNullable<typeof p>=>Boolean(p));
 const assignments=layoutLineup(starters,tactic.formation),sorted=[...club.players].sort((a,b)=>b.overall-a.overall);
 const avgCondition=starters.length?Math.round(starters.reduce((s,p)=>s+p.condition,0)/starters.length):0,avgOverall=starters.length?Math.round(starters.reduce((s,p)=>s+p.overall,0)/starters.length):0;
 return <div className={styles.layout}>
  <section className={styles.pitchCard}>
   <header><div><span>QUADRO TÁTICO</span><h2>{club.name} <i>vs</i> {opponent.name}</h2></div><div className={styles.summary}><b>{tactic.formation}</b><small>{lineupIds.length}/11 titulares</small></div></header>
   <div className={styles.pitch}>
    <div className={styles.half}/><div className={styles.circle}/><div className={`${styles.box} ${styles.topBox}`}/><div className={`${styles.box} ${styles.bottomBox}`}/>
    {assignments.map(({slot,player})=><button key={player.id} className={styles.player} style={{left:`${slot.x}%`,top:`${slot.y}%`}} onClick={()=>onToggle(player.id)} title={`${player.name} • ${player.position} • OVR ${player.overall}`}><span>{player.position}</span><b>{player.name.split(" ")[0]}</b><small>OVR {player.overall}</small></button>)}
   </div>
   <div className={styles.pitchFooter}><span><Users/> OVR médio <b>{avgOverall||"—"}</b></span><span><Shield/> Condição <b>{avgCondition||"—"}%</b></span><small>Os jogadores são distribuídos pela função mais compatível com a formação escolhida.</small></div>
  </section>

  <section className={styles.side}>
   <div className={styles.panel}><header><SlidersHorizontal/><div><b>PLANO DE JOGO</b><small>A formação reorganiza o campo imediatamente.</small></div></header>
    <label>FORMAÇÃO</label><div className={styles.options}>{(["4-2-3-1","4-3-3","4-4-2"] as Formation[]).map(value=><button key={value} className={tactic.formation===value?styles.active:""} onClick={()=>onChange({...tactic,formation:value})}>{value}</button>)}</div>
    <label>MENTALIDADE</label><div className={styles.options}>{(["Defensiva","Equilibrada","Ofensiva"] as Mentality[]).map(value=><button key={value} className={tactic.mentality===value?styles.active:""} onClick={()=>onChange({...tactic,mentality:value})}>{value}</button>)}</div>
    <Range label="Pressão" value={tactic.pressing} onChange={pressing=>onChange({...tactic,pressing})}/><Range label="Ritmo" value={tactic.tempo} onChange={tempo=>onChange({...tactic,tempo})}/>
   </div>
   <div className={styles.panel}><header><Users/><div><b>ESCOLHA DOS 11</b><small>Clique no jogador para incluir ou retirar do time.</small></div></header><div className={styles.players}>{sorted.map(p=>{const selected=lineupIds.includes(p.id),blocked=p.injuryDays>0||p.suspensionMatches>0;return <button key={p.id} disabled={blocked} className={selected?styles.selected:""} onClick={()=>onToggle(p.id)}><i>{p.position}</i><span><b>{p.name}</b><small>{blocked?p.status:`OVR ${p.overall} • Cond. ${p.condition}%`}</small></span><em>{selected?"XI":"+"}</em></button>})}</div></div>
   <button className={styles.play} disabled={lineupIds.length!==11} onClick={onPlay}><Play size={16} fill="currentColor"/>{lineupIds.length===11?"ENTRAR EM CAMPO":"SELECIONE 11 TITULARES"}</button>
  </section>
 </div>;
}
function Range({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <label className={styles.range}><span>{label}<b>{value}</b></span><input type="range" min="20" max="90" value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
