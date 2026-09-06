"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Play, Repeat2, ShieldAlert, Users } from "lucide-react";
import type { LeagueClub } from "@/game-engine/league";
import { playFirstHalf, playSecondHalf, makeSubstitution, requiredUserSubstitutions, setTeamTalk, updateLiveTactic, type LiveMatchState, type TeamTalk } from "@/game-engine/live-match";
import type { Mentality } from "@/game-engine/match";
import liveStyles from "./live-match.module.css";

export default function LiveMatchView({session,home,away,onChange,onFinish}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub;onChange:(next:LiveMatchState)=>void;onFinish:(session:LiveMatchState)=>void}){
  const [outId,setOutId]=useState("");
  const [inId,setInId]=useState("");
  const userClub=session.userSide==="home"?home:away;
  const userLineupIds=session.userSide==="home"?session.homeLineupIds:session.awayLineupIds;
  const userBenchIds=session.userSide==="home"?session.homeBenchIds:session.awayBenchIds;
  const userTactic=session.userSide==="home"?session.homeTactic:session.awayTactic;
  const substitutions=session.substitutions.filter(s=>s.side===session.userSide);
  const required=requiredUserSubstitutions(session);
  const playerById=useMemo(()=>new Map([...home.players,...away.players].map(p=>[p.id,p])),[home,away]);

  function changeTactic(patch:Partial<typeof userTactic>){onChange(updateLiveTactic(session,session.userSide,{...userTactic,...patch}));}
  function substitute(){if(!outId||!inId)return;onChange(makeSubstitution(session,session.userSide,outId,inId));setOutId("");setInId("");}

  return <div className={liveStyles.layout}>
    <section className={liveStyles.scoreboard}>
      <span>{session.phase==="pre_match"?"PRÉ-JOGO":session.phase==="halftime"?"INTERVALO":"ENCERRADO"}</span>
      <div><b>{home.name}</b><strong>{session.homeGoals} <i>×</i> {session.awayGoals}</strong><b>{away.name}</b></div>
      <small>Posse {session.possessionHome}%–{100-session.possessionHome}% • Finalizações {session.shotsHome}–{session.shotsAway}</small>
      {session.phase==="pre_match"&&<button className={liveStyles.primary} onClick={()=>onChange(playFirstHalf(session,home,away))}><Play size={16} fill="currentColor"/> JOGAR 1º TEMPO</button>}
      {session.phase==="halftime"&&<button className={liveStyles.primary} disabled={required.length>0} onClick={()=>onChange(playSecondHalf(session,home,away))}><Play size={16} fill="currentColor"/> {required.length?"RESOLVA A LESÃO":"VOLTAR PARA O 2º TEMPO"}</button>}
      {session.phase==="fulltime"&&<button className={liveStyles.primary} onClick={()=>onFinish(session)}>ENCERRAR RODADA <ChevronRight size={16}/></button>}
    </section>

    {session.phase==="halftime"&&<section className={liveStyles.decisions}>
      <div className={liveStyles.panel}>
        <header><Users size={16}/><div><b>CONVERSA NO INTERVALO</b><small>A fala gera um pequeno impulso contextual no 2º tempo.</small></div></header>
        <div className={liveStyles.talks}>{(["Cobrar","Incentivar","Acalmar"] as TeamTalk[]).map(talk=><button key={talk} className={session.teamTalk===talk?liveStyles.active:""} onClick={()=>onChange(setTeamTalk(session,talk))}>{talk}</button>)}</div>
      </div>

      <div className={liveStyles.panel}>
        <header><Repeat2 size={16}/><div><b>SUBSTITUIÇÕES • {substitutions.length}/5</b><small>Escolha quem sai e quem entra. Jogador substituído não pode voltar.</small></div></header>
        {required.length>0&&<div className={liveStyles.alert}><ShieldAlert size={15}/><span>{required.map(id=>playerById.get(id)?.name).filter(Boolean).join(", ")} precisa sair por lesão.</span></div>}
        <div className={liveStyles.subRow}>
          <label>SAI<select value={outId} onChange={e=>setOutId(e.target.value)}><option value="">Selecione</option>{userLineupIds.map(id=>{const p=playerById.get(id);return <option key={id} value={id}>{required.includes(id)?"🩺 ":""}{p?.position} • {p?.name}</option>})}</select></label>
          <label>ENTRA<select value={inId} onChange={e=>setInId(e.target.value)}><option value="">Selecione</option>{userBenchIds.map(id=>{const p=playerById.get(id);return <option key={id} value={id}>{p?.position} • {p?.name} • OVR {p?.overall}</option>})}</select></label>
          <button disabled={!outId||!inId||substitutions.length>=5} onClick={substitute}>TROCAR</button>
        </div>
        {substitutions.length>0&&<div className={liveStyles.subHistory}>{substitutions.map((sub,i)=><span key={`${sub.outPlayerId}-${i}`}>{playerById.get(sub.outPlayerId)?.name} → <b>{playerById.get(sub.inPlayerId)?.name}</b></span>)}</div>}
      </div>

      <div className={liveStyles.panel}>
        <header><ShieldAlert size={16}/><div><b>AJUSTE TÁTICO</b><small>As mudanças abaixo valem para o segundo tempo.</small></div></header>
        <label>Mentalidade</label><div className={liveStyles.choices}>{(["Defensiva","Equilibrada","Ofensiva"] as Mentality[]).map(value=><button key={value} className={userTactic.mentality===value?liveStyles.active:""} onClick={()=>changeTactic({mentality:value})}>{value}</button>)}</div>
        <label>Pressão <b>{userTactic.pressing}</b></label><input type="range" min="20" max="90" value={userTactic.pressing} onChange={e=>changeTactic({pressing:Number(e.target.value)})}/>
        <label>Ritmo <b>{userTactic.tempo}</b></label><input type="range" min="20" max="90" value={userTactic.tempo} onChange={e=>changeTactic({tempo:Number(e.target.value)})}/>
      </div>
    </section>}

    <section className={liveStyles.commentary}>
      <header><b>NARRAÇÃO</b><small>{session.events.length} acontecimentos</small></header>
      <div>{session.events.map((event,index)=><article key={`${event.minute}-${event.type}-${index}`} className={event.type==="goal"?liveStyles.goal:event.type==="injury"?liveStyles.injury:""}><time>{event.minute===0?"00'":`${event.minute}'`}</time><span>{event.type==="goal"?"⚽":event.type==="card"?"🟨":event.type==="injury"?"🩺":"•"}</span><p>{event.text}</p></article>)}</div>
    </section>

    <section className={liveStyles.squads}>
      <div><b>{userClub.name} EM CAMPO</b>{userLineupIds.map(id=>{const p=playerById.get(id);return <span key={id}><i>{p?.position}</i>{p?.name}<small>{p?.condition}%</small></span>})}</div>
      <div><b>BANCO</b>{userBenchIds.slice(0,8).map(id=>{const p=playerById.get(id);return <span key={id}><i>{p?.position}</i>{p?.name}<small>OVR {p?.overall}</small></span>})}</div>
    </section>
  </div>;
}
