"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Gauge, Pause, Play, Repeat2, ShieldAlert, Users } from "lucide-react";
import type { LeagueClub } from "@/game-engine/league";
import { advanceLiveMatchMinute, isLiveMatchRunning, makeSubstitution, requiredUserSubstitutions, resumeSecondHalf, setTeamTalk, startLiveMatch, updateLiveTactic, type LiveMatchState, type MatchSpeed, type TeamTalk } from "@/game-engine/live-match";
import type { Mentality } from "@/game-engine/match";
import { layoutLineup } from "@/game-engine/tactics-layout";
import liveStyles from "./live-match.module.css";

const SPEED_MS:Record<MatchSpeed,number>={normal:900,fast:300,very_fast:90};
const SPEED_LABEL:Record<MatchSpeed,string>={normal:"NORMAL",fast:"RÁPIDO",very_fast:"MUITO RÁPIDO"};

export default function LiveMatchView({session,home,away,onChange,onFinish}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub;onChange:(next:LiveMatchState)=>void;onFinish:(session:LiveMatchState)=>void}){
 const [running,setRunning]=useState(false),[speed,setSpeed]=useState<MatchSpeed>("normal"),[outId,setOutId]=useState(""),[inId,setInId]=useState("");
 const userClub=session.userSide==="home"?home:away,userLineupIds=session.userSide==="home"?session.homeLineupIds:session.awayLineupIds,userBenchIds=session.userSide==="home"?session.homeBenchIds:session.awayBenchIds,userTactic=session.userSide==="home"?session.homeTactic:session.awayTactic;
 const substitutions=session.substitutions.filter(s=>s.side===session.userSide),required=requiredUserSubstitutions(session);
 const playerById=useMemo(()=>new Map([...home.players,...away.players].map(p=>[p.id,p])),[home,away]);
 const homeAssignments=layoutLineup(session.homeLineupIds.map(id=>playerById.get(id)).filter((p):p is NonNullable<typeof p>=>Boolean(p)),session.homeTactic.formation);
 const awayAssignments=layoutLineup(session.awayLineupIds.map(id=>playerById.get(id)).filter((p):p is NonNullable<typeof p>=>Boolean(p)),session.awayTactic.formation);

 useEffect(()=>{
  if(!running||!isLiveMatchRunning(session)||required.length)return;
  const timer=window.setTimeout(()=>{
   const next=advanceLiveMatchMinute(session,home,away);
   onChange(next);
   if(next.phase==="halftime"||next.phase==="fulltime"||requiredUserSubstitutions(next).length)setRunning(false);
  },SPEED_MS[speed]);
  return()=>window.clearTimeout(timer);
 },[running,speed,session,home,away,onChange,required.length]);

 function changeTactic(patch:Partial<typeof userTactic>){onChange(updateLiveTactic(session,session.userSide,{...userTactic,...patch}));}
 function substitute(){if(!outId||!inId)return;onChange(makeSubstitution(session,session.userSide,outId,inId));setOutId("");setInId("");}
 function start(){onChange(startLiveMatch(session,home));setRunning(true)}
 function resume(){const next=resumeSecondHalf(session);onChange(next);if(next.phase==="second_half_window")setRunning(true)}
 const phaseLabel=session.phase==="pre_match"?"PRÉ-JOGO":session.phase==="first_half"?"1º TEMPO":session.phase==="halftime"?"INTERVALO":session.phase==="second_half_window"?"2º TEMPO":"ENCERRADO";

 return <div className={liveStyles.layout}>
  <section className={liveStyles.scoreboard}>
   <div className={liveStyles.clock}><span>{phaseLabel}</span><strong>{session.phase==="halftime"?"INT":session.phase==="fulltime"?"90′":`${String(session.currentMinute).padStart(2,"0")}′`}</strong></div>
   <div className={liveStyles.scoreLine}><b>{home.shortName}</b><strong>{session.homeGoals}<i>×</i>{session.awayGoals}</strong><b>{away.shortName}</b></div>
   <div className={liveStyles.matchStats}><span>POSSE <b>{session.possessionHome}%</b>–<b>{100-session.possessionHome}%</b></span><span>FINALIZAÇÕES <b>{session.shotsHome}</b>–<b>{session.shotsAway}</b></span><span>xG <b>{session.xgHome.toFixed(2)}</b>–<b>{session.xgAway.toFixed(2)}</b></span><span>GRANDES CHANCES <b>{session.bigChancesHome}</b>–<b>{session.bigChancesAway}</b></span><span>TROCAS <b>{substitutions.length}/5</b></span></div>
   <div className={liveStyles.transport}>
    {session.phase==="pre_match"?<button className={liveStyles.primary} onClick={start}><Play size={15} fill="currentColor"/> COMEÇAR PARTIDA</button>:session.phase==="fulltime"?<button className={liveStyles.primary} onClick={()=>onFinish(session)}>ENCERRAR RODADA <ChevronRight size={16}/></button>:session.phase!=="halftime"?<button className={liveStyles.playPause} disabled={required.length>0} onClick={()=>setRunning(v=>!v)}>{running?<><Pause size={15} fill="currentColor"/> PAUSAR</>:<><Play size={15} fill="currentColor"/> CONTINUAR</>}</button>:null}
    {session.phase!=="pre_match"&&session.phase!=="fulltime"&&<div className={liveStyles.speed}><Gauge size={15}/>{(["normal","fast","very_fast"] as MatchSpeed[]).map(value=><button key={value} className={speed===value?liveStyles.speedActive:""} onClick={()=>setSpeed(value)}>{SPEED_LABEL[value]}</button>)}</div>}
   </div>
  </section>

  {required.length>0&&<div className={liveStyles.injuryStop}><ShieldAlert/><div><b>PARTIDA PAUSADA POR LESÃO</b><span>{required.map(id=>playerById.get(id)?.name).filter(Boolean).join(", ")} precisa ser substituído para o relógio continuar.</span></div></div>}

  {session.phase==="halftime"&&<section className={liveStyles.halftime}>
   <div><Users/><span>INTERVALO</span><h3>Qual é a mensagem para o elenco?</h3><p>A resposta influencia o início do segundo tempo e perde força gradualmente.</p></div>
   <div className={liveStyles.talks}>{(["Cobrar","Incentivar","Acalmar"] as TeamTalk[]).map(talk=><button key={talk} className={session.teamTalk===talk?liveStyles.active:""} onClick={()=>onChange(setTeamTalk(session,talk))}>{talk}</button>)}</div>
   <button className={liveStyles.primary} disabled={required.length>0} onClick={resume}><Play size={15} fill="currentColor"/> INICIAR 2º TEMPO</button>
  </section>}

  <section className={liveStyles.matchGrid}>
   <div className={liveStyles.pitchPanel}>
    <header><div><b>CAMPO AO VIVO</b><small>{home.name} × {away.name}</small></div><span>{userTactic.formation} • {userTactic.mentality}</span></header>
    <div className={liveStyles.pitch}>
     <div className={liveStyles.centerCircle}/><div className={`${liveStyles.box} ${liveStyles.topBox}`}/><div className={`${liveStyles.box} ${liveStyles.bottomBox}`}/>
     {homeAssignments.map(({slot,player})=><div key={`h-${player.id}`} className={`${liveStyles.pitchPlayer} ${liveStyles.homePlayer} ${session.userSide==="home"?liveStyles.userPlayer:""}`} style={{left:`${slot.x}%`,top:`${slot.y}%`}}><i>{player.position}</i><b>{player.name.split(" ")[0]}</b><small>{session.playerStates[player.id]?.rating.toFixed(1)??"6.0"}</small></div>)}
     {awayAssignments.map(({slot,player})=><div key={`a-${player.id}`} className={`${liveStyles.pitchPlayer} ${liveStyles.awayPlayer} ${session.userSide==="away"?liveStyles.userPlayer:""}`} style={{left:`${100-slot.x}%`,top:`${100-slot.y}%`}}><i>{player.position}</i><b>{player.name.split(" ")[0]}</b><small>{session.playerStates[player.id]?.rating.toFixed(1)??"6.0"}</small></div>)}
    </div>
   </div>

   <div className={liveStyles.controlColumn}>
    <div className={liveStyles.panel}>
     <header><ShieldAlert size={16}/><div><b>AJUSTE TÁTICO</b><small>As mudanças passam a valer no próximo minuto.</small></div></header>
     <label>Mentalidade</label><div className={liveStyles.choices}>{(["Defensiva","Equilibrada","Ofensiva"] as Mentality[]).map(value=><button key={value} className={userTactic.mentality===value?liveStyles.active:""} onClick={()=>changeTactic({mentality:value})}>{value}</button>)}</div>
     <label>Pressão <b>{userTactic.pressing}</b></label><input type="range" min="20" max="90" value={userTactic.pressing} onChange={e=>changeTactic({pressing:Number(e.target.value)})}/>
     <label>Ritmo <b>{userTactic.tempo}</b></label><input type="range" min="20" max="90" value={userTactic.tempo} onChange={e=>changeTactic({tempo:Number(e.target.value)})}/>
    </div>
    <div className={liveStyles.panel}>
     <header><Repeat2 size={16}/><div><b>SUBSTITUIÇÕES • {substitutions.length}/5</b><small>Você pode mexer em qualquer minuto da partida.</small></div></header>
     <div className={liveStyles.subRow}><label>SAI<select value={outId} onChange={e=>setOutId(e.target.value)}><option value="">Selecione</option>{userLineupIds.map(id=>{const p=playerById.get(id);return <option key={id} value={id}>{required.includes(id)?"🩺 ":""}{p?.position} • {p?.name} • {session.playerStates[id]?.condition.toFixed(0)??p?.condition}% • N {session.playerStates[id]?.rating.toFixed(1)??"6.0"}</option>})}</select></label><label>ENTRA<select value={inId} onChange={e=>setInId(e.target.value)}><option value="">Selecione</option>{userBenchIds.map(id=>{const p=playerById.get(id);return <option key={id} value={id}>{p?.position} • {p?.name} • OVR {p?.overall} • COND {session.playerStates[id]?.condition.toFixed(0)??p?.condition}%</option>})}</select></label><button disabled={!outId||!inId||substitutions.length>=5||session.phase==="pre_match"||session.phase==="fulltime"} onClick={substitute}>TROCAR</button></div>
     {substitutions.length>0&&<div className={liveStyles.subHistory}>{substitutions.slice().reverse().map((sub,i)=><span key={`${sub.outPlayerId}-${i}`}><small>{sub.minute} min</small> {playerById.get(sub.outPlayerId)?.name} → <b>{playerById.get(sub.inPlayerId)?.name}</b></span>)}</div>}
    </div>
   </div>
  </section>

  <section className={liveStyles.commentary}><header><b>DADOS AVANÇADOS</b><small>Passes {session.passesHome}–{session.passesAway} • Desarmes {session.tacklesHome}–{session.tacklesAway} • Interceptações {session.interceptionsHome}–{session.interceptionsAway} • Expulsões {session.sentOffPlayerIds.length}</small></header></section>

  <section className={liveStyles.commentary}><header><b>NARRAÇÃO EVENTO A EVENTO</b><small>{session.events.length} acontecimentos • relógio {session.currentMinute} min</small></header><div>{session.events.slice().reverse().map((event,index)=><article key={`${event.minute}-${event.type}-${index}`} className={event.type==="goal"?liveStyles.goal:event.type==="injury"?liveStyles.injury:""}><time>{event.minute===0?"00′":`${event.minute}′`}</time><span>{event.type==="goal"?"⚽":event.type==="card"?"🟨":event.type==="red_card"?"🟥":event.type==="injury"?"🩺":event.type==="halftime"?"⏸":"•"}</span><p>{event.text}</p></article>)}</div></section>

  <section className={liveStyles.squads}><div><b>{userClub.name} EM CAMPO</b>{userLineupIds.map(id=>{const p=playerById.get(id);return <span key={id}><i>{p?.position}</i>{p?.name}<small>COND {session.playerStates[id]?.condition.toFixed(0)??p?.condition}% • FAD {session.playerStates[id]?.fatigue.toFixed(0)??p?.fatigue}% • N {session.playerStates[id]?.rating.toFixed(1)??"6.0"}</small></span>})}</div><div><b>BANCO</b>{userBenchIds.slice(0,9).map(id=>{const p=playerById.get(id);return <span key={id}><i>{p?.position}</i>{p?.name}<small>OVR {p?.overall}</small></span>})}</div></section>
 </div>;
}
