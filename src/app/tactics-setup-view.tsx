"use client";

import{useRef,useState,type PointerEvent}from"react";
import { Move, Play, Shield, SlidersHorizontal, Users } from "lucide-react";
import type { LeagueClub } from "@/game-engine/league";
import type { Formation, MatchTactic, Mentality } from "@/game-engine/match";
import type{MatchdayRole}from"@/game-engine/season";
import { lineupPlacements } from "@/game-engine/tactics-layout";
import{clampTacticalPoint,tacticalFitMultiplier,tacticalZone}from"@/game-engine/tactical-position";
import styles from "./tactics-setup.module.css";

export default function TacticsSetupView({club,opponent,tactic,onChange,lineupIds,benchIds,benchSize,onSetRole,onPlay}:{club:LeagueClub;opponent:LeagueClub;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];benchIds:string[];benchSize:number;onSetRole:(id:string,role:MatchdayRole)=>void;onPlay:()=>void}){
 const pitchRef=useRef<HTMLDivElement>(null),[dragging,setDragging]=useState<string|null>(null);
 const starters=lineupIds.map(id=>club.players.find(p=>p.id===id)).filter((p):p is NonNullable<typeof p>=>Boolean(p)),placements=lineupPlacements(starters,tactic.formation,tactic.positions),sorted=[...club.players].sort((a,b)=>b.overall-a.overall),available=club.players.filter(p=>p.injuryDays===0&&p.suspensionMatches===0),requiredBench=Math.max(0,Math.min(benchSize,available.length-11)),selectionReady=lineupIds.length===11&&benchIds.length===requiredBench;
 const avgCondition=starters.length?Math.round(starters.reduce((s,p)=>s+p.condition,0)/starters.length):0,avgOverall=starters.length?Math.round(starters.reduce((s,p)=>s+p.overall*tacticalFitMultiplier(p,tactic.positions?.[p.id]),0)/starters.length):0;
 function movePlayer(event:PointerEvent<HTMLElement>,id:string){if(dragging!==id||!pitchRef.current)return;const rect=pitchRef.current.getBoundingClientRect(),point=clampTacticalPoint({x:(event.clientX-rect.left)/rect.width*100,y:(event.clientY-rect.top)/rect.height*100});onChange({...tactic,positions:{...(tactic.positions??{}),[id]:point}});}
 function startDrag(event:PointerEvent<HTMLButtonElement>,id:string){event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setDragging(id);}
 function formation(value:Formation){onChange({...tactic,formation:value,positions:undefined});}
 return <div className={styles.layout}>
  <section className={styles.pitchCard}>
   <header><div><span>QUADRO TÁTICO FLEXÍVEL</span><h2>{club.name} <i>vs</i> {opponent.name}</h2></div><div className={styles.summary}><b>{tactic.formation}</b><small>{lineupIds.length}/11 titulares • {benchIds.length}/{requiredBench} banco</small></div></header>
   <div className={styles.pitch} ref={pitchRef}>
    <div className={styles.half}/><div className={styles.circle}/><div className={`${styles.box} ${styles.topBox}`}/><div className={`${styles.box} ${styles.bottomBox}`}/>
    {placements.map(({player,point})=>{const fit=Math.round(tacticalFitMultiplier(player,point)*100);return <button key={player.id} className={`${styles.player} ${dragging===player.id?styles.dragging:""}`} style={{left:`${point.x}%`,top:`${point.y}%`}} onPointerDown={event=>startDrag(event,player.id)} onPointerMove={event=>movePlayer(event,player.id)} onPointerUp={()=>setDragging(null)} onPointerCancel={()=>setDragging(null)} title={`${player.name} • ${tacticalZone(point)} • encaixe ${fit}%`}><span>{player.position}</span><b>{player.name.split(" ")[0]}</b><small>OVR {player.overall} • {fit}%</small></button>})}
   </div>
   <div className={styles.pitchFooter}><span><Users/> OVR efetivo <b>{avgOverall||"—"}</b></span><span><Shield/> Condição <b>{avgCondition||"—"}%</b></span><small><Move/> Arraste os jogadores. Sair muito da função natural reduz o rendimento.</small></div>
  </section>

  <section className={styles.side}>
   <div className={styles.panel}><header><SlidersHorizontal/><div><b>PLANO DE JOGO</b><small>A formação cria a base; depois você pode mover cada jogador livremente.</small></div></header>
    <label>FORMAÇÃO BASE</label><div className={styles.options}>{(["4-2-3-1","4-3-3","4-4-2"] as Formation[]).map(value=><button key={value} className={tactic.formation===value?styles.active:""} onClick={()=>formation(value)}>{value}</button>)}</div>
    <label>MENTALIDADE</label><div className={styles.options}>{(["Defensiva","Equilibrada","Ofensiva"] as Mentality[]).map(value=><button key={value} className={tactic.mentality===value?styles.active:""} onClick={()=>onChange({...tactic,mentality:value})}>{value}</button>)}</div>
    <Range label="Pressão" value={tactic.pressing} onChange={pressing=>onChange({...tactic,pressing})}/><Range label="Ritmo" value={tactic.tempo} onChange={tempo=>onChange({...tactic,tempo})}/>
   </div>
   <div className={styles.panel}><header><Users/><div><b>CONVOCAÇÃO DA PARTIDA</b><small>Defina quem começa, quem fica no banco e quem não será relacionado.</small></div></header><div className={styles.selectionSummary}><b>XI {lineupIds.length}/11</b><b>BANCO {benchIds.length}/{requiredBench}</b><b>FORA {club.players.length-lineupIds.length-benchIds.length}</b></div><div className={styles.players}>{sorted.map(p=>{const starter=lineupIds.includes(p.id),bench=benchIds.includes(p.id),blocked=p.injuryDays>0||p.suspensionMatches>0;return <div key={p.id} className={`${styles.playerRow} ${starter?styles.selected:bench?styles.benchSelected:""}`}><i>{p.position}</i><span><b>{p.name}</b><small>{blocked?p.status:`OVR ${p.overall} • POT ${p.potential} • Cond. ${p.condition}%`}</small></span><div className={styles.roles}><button disabled={blocked} className={starter?styles.roleActive:""} onClick={()=>onSetRole(p.id,"starter")}>XI</button><button disabled={blocked} className={bench?styles.roleActive:""} onClick={()=>onSetRole(p.id,"bench")}>B</button><button disabled={blocked} className={!starter&&!bench?styles.roleActive:""} onClick={()=>onSetRole(p.id,"out")}>F</button></div></div>})}</div></div>
   <button className={styles.play} disabled={!selectionReady} onClick={onPlay}><Play size={16} fill="currentColor"/>{selectionReady?"ENTRAR EM CAMPO":lineupIds.length!==11?`SELECIONE 11 TITULARES`:`COMPLETE O BANCO (${benchIds.length}/${requiredBench})`}</button>
  </section>
 </div>;
}
function Range({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <label className={styles.range}><span>{label}<b>{value}</b></span><input type="range" min="20" max="90" value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
