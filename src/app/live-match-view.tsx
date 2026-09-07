"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Gauge, Lightbulb, Pause, Play, Repeat2, ShieldAlert, Users } from "lucide-react";
import type { LeagueClub, LeaguePlayer } from "@/game-engine/league";
import {
  advanceLiveMatchMinute,
  isLiveMatchRunning,
  makeSubstitution,
  requiredUserSubstitutions,
  resumeSecondHalf,
  setTeamTalk,
  startLiveMatch,
  updateLiveTactic,
  type HeatCell,
  type LiveMatchState,
  type MatchSpeed,
  type TeamTalk,
} from "@/game-engine/live-match";
import {
  normalizeTactic,
  type AttackFocus,
  type BuildUp,
  type DefensiveLine,
  type Marking,
  type Mentality,
  type SetPiecePost,
  type TeamWidth,
} from "@/game-engine/match";
import { layoutLineup } from "@/game-engine/tactics-layout";
import liveStyles from "./live-match.module.css";

const SPEED_MS:Record<MatchSpeed,number>={normal:900,fast:300,very_fast:90};
const SPEED_LABEL:Record<MatchSpeed,string>={normal:"NORMAL",fast:"RÁPIDO",very_fast:"MUITO RÁPIDO"};
const POSITIONS=["GOL","LD","ZAG","LE","VOL","MC","MEI","PD","PE","ATA"];
const HEAT:HeatCell[]=["def-left","def-center","def-right","mid-left","mid-center","mid-right","att-left","att-center","att-right"];
const emptyHeat=()=>Object.fromEntries(HEAT.map(key=>[key,0])) as Record<HeatCell,number>;

export default function LiveMatchView({session,home,away,defaultSpeed,assistantTeamTalks,showStaffAdvice,onChange,onFinish}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub;defaultSpeed:MatchSpeed;assistantTeamTalks:boolean;showStaffAdvice:boolean;onChange:(next:LiveMatchState)=>void;onFinish:(session:LiveMatchState)=>void}){
  const [running,setRunning]=useState(false);
  const [speed,setSpeed]=useState<MatchSpeed>(defaultSpeed);
  const [outId,setOutId]=useState("");
  const [inId,setInId]=useState("");
  const [finishing,setFinishing]=useState(false);
  const [goalFlash,setGoalFlash]=useState(false);
  const seenGoal=useRef("");

  const userSide=session.userSide;
  const userClub=userSide==="home"?home:away;
  const lineupIds=userSide==="home"?session.homeLineupIds:session.awayLineupIds;
  const benchIds=userSide==="home"?session.homeBenchIds:session.awayBenchIds;
  const raw=userSide==="home"?session.homeTactic:session.awayTactic;
  const tactic=normalizeTactic(raw);
  const required=requiredUserSubstitutions(session);
  const subs=session.substitutions.filter(item=>item.side===userSide);

  const byId=useMemo(()=>new Map([...home.players,...away.players].map(player=>[player.id,player])),[home,away]);
  const rank=(id:string)=>{const player=byId.get(id),positionRank=POSITIONS.indexOf(player?.position??"");return(positionRank<0?99:positionRank)*100-(player?.overall??0)};
  const lineup=[...lineupIds].sort((a,b)=>rank(a)-rank(b));
  const bench=[...benchIds].sort((a,b)=>rank(a)-rank(b));

  const homeLayout=layoutLineup(session.homeLineupIds.map(id=>byId.get(id)).filter((player):player is LeaguePlayer=>Boolean(player)),session.homeTactic.formation);
  const awayLayout=layoutLineup(session.awayLineupIds.map(id=>byId.get(id)).filter((player):player is LeaguePlayer=>Boolean(player)),session.awayTactic.formation);
  const userLayout=userSide==="home"?homeLayout:awayLayout;
  const opponentLayout=userSide==="home"?awayLayout:homeLayout;
  const userBaseClass=userSide==="home"?liveStyles.homePlayer:liveStyles.awayPlayer;
  const opponentBaseClass=userSide==="home"?liveStyles.awayPlayer:liveStyles.homePlayer;
  const userPitchPosition=(slot:{x:number;y:number})=>({left:`${slot.x}%`,top:`${52+slot.y*.43}%`});
  const opponentPitchPosition=(slot:{x:number;y:number})=>({left:`${100-slot.x}%`,top:`${48-slot.y*.43}%`});

  const heat:Record<HeatCell,number>=userSide==="home"?(session.homeHeatmap??emptyHeat()):(session.awayHeatmap??emptyHeat());
  const zones=userSide==="home"?(session.homeAttackZones??{left:0,center:0,right:0}):(session.awayAttackZones??{left:0,center:0,right:0});
  const zoneTotal=Math.max(1,zones.left+zones.center+zones.right);
  const heatMax=Math.max(1,...HEAT.map(key=>heat[key]));
  const momentum=(userSide==="home"?1:-1)*(session.momentumHome??0);
  const latestEvent=session.events[session.events.length-1];
  const importantEvents=session.events.filter(event=>["goal","card","red_card","injury"].includes(event.type)).slice(-8).reverse();
  const latestGoal=[...session.events].reverse().find(event=>event.type==="goal");
  const goalKey=latestGoal?`${latestGoal.minute}:${latestGoal.team}:${latestGoal.playerId??""}:${session.homeGoals}-${session.awayGoals}`:"";
  useEffect(()=>{if(!goalKey||goalKey===seenGoal.current)return;seenGoal.current=goalKey;setGoalFlash(true);const timer=window.setTimeout(()=>setGoalFlash(false),2600);return()=>window.clearTimeout(timer)},[goalKey]);

  useEffect(()=>{
    if(!running||!isLiveMatchRunning(session)||required.length)return;
    const timer=window.setTimeout(()=>{
      const next=advanceLiveMatchMinute(session,home,away);
      onChange(next);
      if(next.phase==="halftime"||next.phase==="fulltime"||requiredUserSubstitutions(next).length)setRunning(false);
    },SPEED_MS[speed]);
    return()=>window.clearTimeout(timer);
  },[running,speed,session,home,away,onChange,required.length]);

  useEffect(()=>{
    if(!assistantTeamTalks||session.phase!=="halftime"||session.teamTalk)return;
    const gf=userSide==="home"?session.homeGoals:session.awayGoals;
    const ga=userSide==="home"?session.awayGoals:session.homeGoals;
    onChange(setTeamTalk(session,gf<ga?"Cobrar":gf>ga?"Acalmar":"Incentivar"));
  },[assistantTeamTalks,session,onChange,userSide]);

  const change=(patch:Partial<typeof raw>)=>onChange(updateLiveTactic(session,userSide,{...raw,...patch}));
  const setPiece=(patch:Partial<typeof tactic.setPieces>)=>change({setPieces:{...tactic.setPieces,...patch}});
  const phase=session.phase==="pre_match"?"PRÉ-JOGO":session.phase==="first_half"?"1º TEMPO":session.phase==="halftime"?"INTERVALO":session.phase==="second_half_window"?"2º TEMPO":"ENCERRADO";
  const gf=userSide==="home"?session.homeGoals:session.awayGoals;
  const ga=userSide==="home"?session.awayGoals:session.homeGoals;
  const shots=userSide==="home"?session.shotsHome:session.shotsAway;
  const oppShots=userSide==="home"?session.shotsAway:session.shotsHome;

  let advice="Manter o plano atual.";
  let patch:Partial<typeof raw>|undefined;
  if(session.currentMinute>=65&&gf<ga){
    advice="Buscar o resultado com linha alta, amplitude e construção mais direta.";
    patch={mentality:"Ofensiva",defensiveLine:"Alta",width:"Ampla",buildUp:"Direta",pressing:Math.min(90,tactic.pressing+10)};
  }else if(session.currentMinute>=70&&gf>ga){
    advice="Controlar vantagem com linha mais baixa e posse curta.";
    patch={defensiveLine:"Baixa",buildUp:"Curta",tempo:Math.max(40,tactic.tempo-10)};
  }else if(momentum<-35){
    advice="O adversário tomou o momentum; mude o corredor principal e acelere.";
    patch={attackFocus:tactic.attackFocus==="Por dentro"?"Pelos lados":"Por dentro",tempo:Math.min(90,tactic.tempo+8)};
  }else if(shots+3<oppShots){
    advice="Estamos cedendo mais finalizações; ajuste marcação e pressão.";
    patch={marking:"Zona",pressing:Math.min(90,tactic.pressing+7)};
  }

  const start=()=>{onChange(startLiveMatch(session,home));setRunning(true)};
  const resume=()=>{const next=resumeSecondHalf(session);onChange(next);if(next.phase==="second_half_window")setRunning(true)};
  const substitute=()=>{if(!outId||!inId)return;onChange(makeSubstitution(session,userSide,outId,inId));setOutId("");setInId("")};
  const cardedIds=new Set(session.events.filter(event=>event.team===userSide&&(event.type==="card"||event.type==="red_card")&&event.playerId).map(event=>event.playerId!));
  const subCandidates=lineup.map(id=>({id,player:byId.get(id),state:session.playerStates[id],score:(100-(session.playerStates[id]?.condition??100))*1.4+Math.max(0,6.2-(session.playerStates[id]?.rating??6))*18+(cardedIds.has(id)?18:0)})).filter(item=>item.player).sort((a,b)=>b.score-a.score);
  const suggestedOut=subCandidates[0],suggestedIn=bench.map(id=>byId.get(id)).filter((player):player is NonNullable<typeof player>=>Boolean(player)).sort((a,b)=>b.overall-a.overall)[0];
  const canSuggestSub=subs.length<session.maxSubstitutions&&session.currentMinute>=50&&suggestedOut&&suggestedIn&&(suggestedOut.score>=16||momentum<-25||gf<ga);
  const subReason=suggestedOut?(cardedIds.has(suggestedOut.id)?"está pendurado e corre risco":(suggestedOut.state?.condition??100)<68?`caiu para ${Math.round(suggestedOut.state?.condition??100)}% de condição`:(suggestedOut.state?.rating??6)<5.9?`está com nota ${(suggestedOut.state?.rating??6).toFixed(1)}`:gf<ga?"pode dar mais energia enquanto buscamos o resultado":momentum<-25?"pode ajudar a recuperar o controle":"é a troca de maior impacto agora"):"";
  const finish=()=>{if(finishing)return;setFinishing(true);onFinish(session)};

  return <div className={liveStyles.layout}>
    <section className={liveStyles.scoreboard}>
      <div className={liveStyles.clock}><span>{phase}</span><strong>{session.phase==="halftime"?"INT":session.phase==="fulltime"?"90′":`${session.currentMinute}′`}</strong></div>
      <div className={liveStyles.scoreLine}><b>{home.shortName}</b><strong>{session.homeGoals}<i>×</i>{session.awayGoals}</strong><b>{away.shortName}</b></div>
      <div className={liveStyles.matchStats}><span>POSSE <b>{session.possessionHome}%</b>–<b>{100-session.possessionHome}%</b></span><span>CHUTES <b>{session.shotsHome}</b>–<b>{session.shotsAway}</b></span><span>xG <b>{session.xgHome.toFixed(2)}</b>–<b>{session.xgAway.toFixed(2)}</b></span><span>ESCANTEIOS <b>{session.cornersHome??0}</b>–<b>{session.cornersAway??0}</b></span></div><div className={`${liveStyles.liveCommentary} ${goalFlash?liveStyles.goalFlash:""}`}><b>{latestEvent?.minute??0}′</b><span>{latestEvent?.type==="goal"?"⚽ ":latestEvent?.type==="card"?"🟨 ":latestEvent?.type==="red_card"?"🟥 ":latestEvent?.type==="injury"?"🩺 ":""}{latestEvent?.text??"Aguardando o início da partida."}{latestEvent?.type==="goal"&&latestEvent.assistPlayerId?<small> Assistência: {byId.get(latestEvent.assistPlayerId)?.name}</small>:null}</span></div><div className={liveStyles.eventBoard}>{importantEvents.map((event,index)=><div key={`${event.minute}-${event.type}-${index}`}><b>{event.minute}′</b><i>{event.type==="goal"?"⚽":event.type==="card"?"🟨":event.type==="red_card"?"🟥":"🩺"}</i><span>{event.playerId?byId.get(event.playerId)?.name:event.text}{event.type==="goal"&&event.assistPlayerId?<small> • assistência {byId.get(event.assistPlayerId)?.name}</small>:null}</span></div>)}</div>
      <div style={{maxWidth:680,margin:"10px auto",display:"grid",gap:5}}><small>MOMENTUM • {momentum>25?`${userClub.shortName} domina`:momentum<-25?"adversário domina":"equilibrado"}</small><div style={{height:9,borderRadius:9,background:"rgba(255,255,255,.12)",position:"relative"}}><i style={{position:"absolute",left:"50%",height:"100%",width:2,background:"#fff"}}/><em style={{position:"absolute",height:"100%",left:momentum>=0?"50%":`${50+momentum/2}%`,width:`${Math.abs(momentum)/2}%`,background:"currentColor",borderRadius:9}}/></div></div>
      <div className={liveStyles.transport}>
        {session.phase==="pre_match"?<button className={liveStyles.primary} onClick={start}><Play size={15}/> COMEÇAR</button>:session.phase==="fulltime"?<button className={liveStyles.primary} disabled={finishing} onClick={finish}>{finishing?"PROCESSANDO...":"VER PÓS-JOGO"} <ChevronRight size={16}/></button>:session.phase!=="halftime"?<button className={liveStyles.playPause} disabled={required.length>0} onClick={()=>setRunning(value=>!value)}>{running?<><Pause size={15}/> PAUSAR</>:<><Play size={15}/> CONTINUAR</>}</button>:null}
        {session.phase!=="pre_match"&&session.phase!=="fulltime"&&<div className={liveStyles.speed}><Gauge size={15}/>{(["normal","fast","very_fast"] as MatchSpeed[]).map(value=><button key={value} className={speed===value?liveStyles.speedActive:""} onClick={()=>setSpeed(value)}>{SPEED_LABEL[value]}</button>)}</div>}
      </div>
    </section>

    {required.length>0&&<div className={liveStyles.injuryStop}><ShieldAlert/><div><b>TROCA OBRIGATÓRIA</b><span>{required.map(id=>byId.get(id)?.name).filter(Boolean).join(", ")}</span></div></div>}

    {session.phase==="halftime"&&<section className={liveStyles.halftime}><div><Users/><h3>Conversa de intervalo</h3><p>A mensagem altera o momentum no começo do segundo tempo.</p></div><div className={liveStyles.talks}>{(["Cobrar","Incentivar","Acalmar"] as TeamTalk[]).map(value=><button key={value} disabled={assistantTeamTalks} className={session.teamTalk===value?liveStyles.active:""} onClick={()=>onChange(setTeamTalk(session,value))}>{value}</button>)}</div><button className={liveStyles.primary} onClick={resume}>INICIAR 2º TEMPO</button></section>}

    <section className={liveStyles.matchGrid}>
      <div className={liveStyles.pitchPanel}>
        <header><div><b>MAPA TÁTICO AO VIVO</b><small>seu time e adversário separados por metade do campo</small></div></header>
        <div className={liveStyles.pitch}>
          <div className={liveStyles.centerCircle}/><div className={`${liveStyles.box} ${liveStyles.topBox}`}/><div className={`${liveStyles.box} ${liveStyles.bottomBox}`}/>
          {HEAT.map((cell,index)=>{const power=heat[cell]/heatMax;return <div key={cell} style={{position:"absolute",left:`${index%3*33.333}%`,top:`${Math.floor(index/3)*33.333}%`,width:"33.333%",height:"33.333%",background:`rgba(255,255,255,${.02+power*.2})`,border:"1px solid rgba(255,255,255,.04)",pointerEvents:"none"}}/>})}
          <div style={{position:"absolute",top:"2%",left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:800,letterSpacing:1.2,opacity:.65,pointerEvents:"none"}}>ADVERSÁRIO</div>
          <div style={{position:"absolute",bottom:"2%",left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:800,letterSpacing:1.2,opacity:.8,pointerEvents:"none"}}>SEU TIME</div>
          {opponentLayout.map(({slot,player})=><div key={`opp-${player.id}`} className={`${liveStyles.pitchPlayer} ${opponentBaseClass}`} style={opponentPitchPosition(slot)}><i>{player.position}</i><b>{player.name.split(" ")[0]}</b><small>{session.playerStates[player.id]?.rating.toFixed(1)??"6.0"}</small></div>)}
          {userLayout.map(({slot,player})=><div key={`user-${player.id}`} className={`${liveStyles.pitchPlayer} ${userBaseClass} ${liveStyles.userPlayer}`} style={userPitchPosition(slot)}><i>{player.position}</i><b>{player.name.split(" ")[0]}</b><small>{session.playerStates[player.id]?.rating.toFixed(1)??"6.0"}</small></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,paddingTop:10}}>{[["ESQUERDA",zones.left],["CENTRO",zones.center],["DIREITA",zones.right]].map(([label,value])=><div key={String(label)}><small>{label}</small><b style={{display:"block"}}>{Math.round(Number(value)/zoneTotal*100)}%</b></div>)}</div>
      </div>

      <div className={liveStyles.controlColumn}>
        {showStaffAdvice&&<div className={`${liveStyles.panel} ${liveStyles.staffPanel}`}><header><Lightbulb size={16}/><b>COMISSÃO</b></header><p>{advice}</p>{patch&&<button onClick={()=>change(patch)}>APLICAR AJUSTE</button>}{canSuggestSub&&<div className={liveStyles.subAdvice}><b>SUGESTÃO DE TROCA</b><span>Sair: {suggestedOut.player?.name} • Entrar: {suggestedIn.name}. {subReason}.</span><button onClick={()=>{setOutId(suggestedOut.id);setInId(suggestedIn.id)}}>PREPARAR TROCA</button></div>}</div>}
        <div className={liveStyles.panel}><header><ShieldAlert size={16}/><b>INSTRUÇÕES</b></header><Select label="Mentalidade" value={tactic.mentality} options={["Defensiva","Equilibrada","Ofensiva"] as Mentality[]} onChange={value=>change({mentality:value as Mentality})}/><Range label="Pressão" value={tactic.pressing} onChange={value=>change({pressing:value})}/><Range label="Ritmo" value={tactic.tempo} onChange={value=>change({tempo:value})}/><Select label="Ataque" value={tactic.attackFocus} options={["Equilibrado","Pelos lados","Por dentro","Esquerda","Direita"] as AttackFocus[]} onChange={value=>change({attackFocus:value as AttackFocus})}/><Select label="Linha defensiva" value={tactic.defensiveLine} options={["Baixa","Média","Alta"] as DefensiveLine[]} onChange={value=>change({defensiveLine:value as DefensiveLine})}/><Select label="Amplitude" value={tactic.width} options={["Estreita","Normal","Ampla"] as TeamWidth[]} onChange={value=>change({width:value as TeamWidth})}/><Select label="Construção" value={tactic.buildUp} options={["Curta","Mista","Direta"] as BuildUp[]} onChange={value=>change({buildUp:value as BuildUp})}/><Select label="Marcação" value={tactic.marking} options={["Zona","Individual","Mista"] as Marking[]} onChange={value=>change({marking:value as Marking})}/></div>
        <div className={liveStyles.panel}><header><ShieldAlert size={16}/><b>BOLAS PARADAS</b></header><Select label="Escanteio" value={tactic.setPieces.cornerAttack} options={["Primeiro pau","Segundo pau","Centro"] as SetPiecePost[]} onChange={value=>setPiece({cornerAttack:value as SetPiecePost})}/><Select label="Defesa" value={tactic.setPieces.cornerDefense} options={["Zona","Individual","Mista"]} onChange={value=>setPiece({cornerDefense:value as "Zona"|"Individual"|"Mista"})}/>{(["cornerTakerId","freeKickTakerId","penaltyTakerId","targetPlayerId"] as const).map((key,index)=><PlayerSelect key={key} label={["Escanteio","Falta","Pênalti","Alvo"][index]} value={tactic.setPieces[key]??""} ids={lineup} byId={byId} onChange={value=>setPiece({[key]:value||undefined})}/>)}</div>
        <div className={liveStyles.panel}>
          <header><Repeat2 size={16}/><b>SUBSTITUIÇÕES {subs.length}/{session.maxSubstitutions}</b></header>
          <div className={liveStyles.subRow}>
            <label>SAI<select value={outId} onChange={event=>setOutId(event.target.value)}><option value="">Selecione</option>{lineup.map(id=>{const player=byId.get(id),state=session.playerStates[id];return <option key={id} value={id}>{player?.position} • {player?.name} • Nota {state?.rating.toFixed(1)??"6.0"} • Cond {state?.condition.toFixed(0)??player?.condition??100}%</option>})}</select></label>
            <label>ENTRA<select value={inId} onChange={event=>setInId(event.target.value)}><option value="">Selecione</option>{bench.map(id=>{const player=byId.get(id),state=session.playerStates[id];return <option key={id} value={id}>{player?.position} • {player?.name} • OVR {player?.overall??"—"} • Cond {state?.condition.toFixed(0)??player?.condition??100}%</option>})}</select></label>
            <button disabled={!outId||!inId} onClick={substitute}>TROCAR</button>
          </div>
          {outId&&<div style={{marginTop:8,fontSize:12,opacity:.82}}>Selecionado para sair: <b>{byId.get(outId)?.name}</b> • nota <b>{session.playerStates[outId]?.rating.toFixed(1)??"6.0"}</b> • condição <b>{session.playerStates[outId]?.condition.toFixed(0)??byId.get(outId)?.condition??100}%</b></div>}
        </div>
      </div>
    </section>

    <section className={liveStyles.panel}><header><b>NARRAÇÃO & ALTERAÇÕES TÁTICAS</b></header><div style={{display:"grid",gap:6,maxHeight:300,overflow:"auto"}}>{session.events.slice().reverse().slice(0,30).map((event,index)=><div key={`${event.minute}-${index}`} style={{display:"grid",gridTemplateColumns:"42px 1fr",gap:8,borderBottom:"1px solid rgba(255,255,255,.08)",padding:6}}><b>{event.minute}′</b><span>{event.text}</span></div>)}</div></section>
  </div>;
}

function Select({label,value,options,onChange}:{label:string;value:string;options:readonly string[];onChange:(value:string)=>void}){
  return <label style={{display:"grid",gap:4,marginTop:8}}><span>{label}</span><select value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
}

function Range({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){
  return <label style={{display:"grid",gap:4,marginTop:8}}><span>{label} <b>{value}</b></span><input type="range" min="20" max="90" value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;
}

function PlayerSelect({label,value,ids,byId,onChange}:{label:string;value:string;ids:string[];byId:Map<string,LeaguePlayer>;onChange:(value:string)=>void}){
  return <label style={{display:"grid",gap:4,marginTop:8}}><span>{label}</span><select value={value} onChange={event=>onChange(event.target.value)}><option value="">Automático</option>{ids.map(id=><option key={id} value={id}>{byId.get(id)?.position} • {byId.get(id)?.name}</option>)}</select></label>;
}
