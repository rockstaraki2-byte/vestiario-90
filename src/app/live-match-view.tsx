"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ClipboardList, Gauge, Lightbulb, Pause, Play, Radio, Repeat2, ShieldAlert, Users } from "lucide-react";
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
  type MatchEvent,
  type Mentality,
  type SetPiecePost,
  type TeamWidth,
} from "@/game-engine/match";
import liveStyles from "./live-match.module.css";
import { positionAwareSubstitutionAdvice } from "@/game-engine/staff-analytics";
import { scoreAtMinute, type MatchdayParallelMatch } from "./matchday-context";
import { cloneTactic, loadTacticalPlans, scenarioForMatch, suggestedTacticalPlan, type SavedTacticPlan } from "./tactical-library";
import TeamBadge from "./team-badge";

const SPEED_MS:Record<MatchSpeed,number>={slow:1650,normal:1050,fast:420,very_fast:150};
const SPEED_LABEL:Record<MatchSpeed,string>={slow:"LENTO",normal:"NORMAL",fast:"RÁPIDO",very_fast:"MUITO RÁPIDO"};
const POSITIONS=["GOL","LD","ZAG","LE","VOL","MC","MEI","PD","PE","ATA"];
type MatchdayNews={id:string;source:string;headline:string;summary?:string};
type MatchdaySocial={id:string;platform:string;tag:string;headline:string};

export default function LiveMatchView({session,home,away,defaultSpeed,assistantTeamTalks,showStaffAdvice,parallelMatches=[],news=[],social=[],onChange,onFinish}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub;defaultSpeed:MatchSpeed;assistantTeamTalks:boolean;showStaffAdvice:boolean;parallelMatches?:MatchdayParallelMatch[];news?:MatchdayNews[];social?:MatchdaySocial[];onChange:(next:LiveMatchState)=>void;onFinish:(session:LiveMatchState)=>void}){
  const [running,setRunning]=useState(false);
  const [speed,setSpeed]=useState<MatchSpeed>(defaultSpeed);
  const [outId,setOutId]=useState("");
  const [inId,setInId]=useState("");
  const [finishing,setFinishing]=useState(false);
  const [goalFlash,setGoalFlash]=useState(false);
  const [gamePlans,setGamePlans]=useState<SavedTacticPlan[]>([]);
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

  const momentum=(userSide==="home"?1:-1)*(session.momentumHome??0);
  const latestEvent=session.events[session.events.length-1];
  const eventKinds=["goal","card","red_card","injury"];
  const homeEvents=session.events.filter(event=>event.team==="home"&&eventKinds.includes(event.type)).slice(-6).reverse();
  const awayEvents=session.events.filter(event=>event.team==="away"&&eventKinds.includes(event.type)).slice(-6).reverse();
  const latestGoal=[...session.events].reverse().find(event=>event.type==="goal");
  const goalKey=latestGoal?`${latestGoal.minute}:${latestGoal.team}:${latestGoal.playerId??""}:${session.homeGoals}-${session.awayGoals}`:"";
  const otherGoal=parallelMatches.flatMap(match=>match.result.events.filter(event=>event.type==="goal"&&event.minute===session.currentMinute).map(event=>({match,event}))).at(0);

  useEffect(()=>{if(!goalKey||goalKey===seenGoal.current)return;seenGoal.current=goalKey;setGoalFlash(true);const timer=window.setTimeout(()=>setGoalFlash(false),2600);return()=>window.clearTimeout(timer)},[goalKey]);
  useEffect(()=>{const timer=window.setTimeout(()=>setGamePlans(loadTacticalPlans(userClub.id)),0);return()=>window.clearTimeout(timer)},[userClub.id]);

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
  const applyGamePlan=(plan:SavedTacticPlan)=>onChange(updateLiveTactic(session,userSide,cloneTactic(plan.tactic)));
  const setPiece=(patch:Partial<typeof tactic.setPieces>)=>change({setPieces:{...tactic.setPieces,...patch}});
  const phase=session.phase==="pre_match"?"PRÉ-JOGO":session.phase==="first_half"?"1º TEMPO":session.phase==="halftime"?"INTERVALO":session.phase==="second_half_window"?"2º TEMPO":"ENCERRADO";
  const gf=userSide==="home"?session.homeGoals:session.awayGoals;
  const ga=userSide==="home"?session.awayGoals:session.homeGoals;
  const shots=userSide==="home"?session.shotsHome:session.shotsAway;
  const oppShots=userSide==="home"?session.shotsAway:session.shotsHome;
  const redCards=session.events.filter(event=>event.team===userSide&&event.type==="red_card").length;
  const planContext={minute:session.currentMinute,goalsFor:gf,goalsAgainst:ga,userRedCards:redCards};
  const currentScenario=scenarioForMatch(planContext);
  const staffGamePlan=suggestedTacticalPlan(gamePlans,planContext);

  let advice="Manter o plano atual.";
  let patch:Partial<typeof raw>|undefined;
  if(session.currentMinute>=65&&gf<ga){advice="Buscar o resultado com linha alta, amplitude e construção mais direta.";patch={mentality:"Ofensiva",defensiveLine:"Alta",width:"Ampla",buildUp:"Direta",pressing:Math.min(90,tactic.pressing+10)};}
  else if(session.currentMinute>=70&&gf>ga){advice="Controlar vantagem com linha mais baixa e posse curta.";patch={defensiveLine:"Baixa",buildUp:"Curta",tempo:Math.max(40,tactic.tempo-10)};}
  else if(momentum<-35){advice="O adversário tomou o momentum; mude o corredor principal e acelere.";patch={attackFocus:tactic.attackFocus==="Por dentro"?"Pelos lados":"Por dentro",tempo:Math.min(90,tactic.tempo+8)};}
  else if(shots+3<oppShots){advice="Estamos cedendo mais finalizações; ajuste marcação e pressão.";patch={marking:"Zona",pressing:Math.min(90,tactic.pressing+7)};}

  const start=()=>{onChange(startLiveMatch(session,home));setRunning(true)};
  const resume=()=>{const next=resumeSecondHalf(session);onChange(next);if(next.phase==="second_half_window")setRunning(true)};
  const substitute=()=>{if(!outId||!inId)return;onChange(makeSubstitution(session,userSide,outId,inId));setOutId("");setInId("")};
  const cardedIds=new Set(session.events.filter(event=>event.team===userSide&&(event.type==="card"||event.type==="red_card")&&event.playerId).map(event=>event.playerId!));
  const subCandidates=lineup.map(id=>({id,player:byId.get(id),state:session.playerStates[id],score:(100-(session.playerStates[id]?.condition??100))*1.4+Math.max(0,6.2-(session.playerStates[id]?.rating??6))*18+(cardedIds.has(id)?18:0)})).filter(item=>item.player).sort((a,b)=>b.score-a.score);
  const positionalAdvice=positionAwareSubstitutionAdvice(userClub,lineupIds,benchIds,session.playerStates,cardedIds,session.currentMinute,gf<ga,momentum);
  const suggestedOut=positionalAdvice?{id:positionalAdvice.outPlayerId,player:byId.get(positionalAdvice.outPlayerId),state:session.playerStates[positionalAdvice.outPlayerId],score:positionalAdvice.score}:subCandidates[0];
  const suggestedIn=positionalAdvice?byId.get(positionalAdvice.inPlayerId):bench.map(id=>byId.get(id)).filter((player):player is NonNullable<typeof player>=>Boolean(player)).sort((a,b)=>b.overall-a.overall)[0];
  const canSuggestSub=subs.length<session.maxSubstitutions&&session.currentMinute>=50&&suggestedOut&&suggestedIn&&(suggestedOut.score>=12||momentum<-25||gf<ga);
  const subReason=positionalAdvice?`${positionalAdvice.reason} • ${positionalAdvice.fitLabel}`:suggestedOut?(cardedIds.has(suggestedOut.id)?"está pendurado e corre risco":(suggestedOut.state?.condition??100)<68?`caiu para ${Math.round(suggestedOut.state?.condition??100)}% de condição`:(suggestedOut.state?.rating??6)<5.9?`está com nota ${(suggestedOut.state?.rating??6).toFixed(1)}`:gf<ga?"pode dar mais energia enquanto buscamos o resultado":momentum<-25?"pode ajudar a recuperar o controle":"é a troca de maior impacto agora"):"";
  const finish=()=>{if(finishing)return;setFinishing(true);onFinish(session)};

  return <div className={liveStyles.layout}>
    {session.phase==="pre_match"&&<MatchdayBrief home={home} away={away} parallelMatches={parallelMatches} news={news} social={social}/>} 
    {otherGoal&&session.phase!=="pre_match"&&session.phase!=="fulltime"&&<div className={liveStyles.otherGoalToast}><Radio/><div><b>GOL EM OUTRO JOGO</b><span>{otherGoal.match.homeShort} {scoreAtMinute(otherGoal.match.result,session.currentMinute).home} × {scoreAtMinute(otherGoal.match.result,session.currentMinute).away} {otherGoal.match.awayShort}</span></div></div>}

    <section className={liveStyles.scoreboard}>
      <div className={liveStyles.clock}><span>{phase}</span><strong>{session.phase==="halftime"?"INT":session.phase==="fulltime"?"90′":`${session.currentMinute}′`}</strong></div>
      <div className={liveStyles.scoreLine}><div style={{display:"grid",justifyItems:"center",gap:4}}><TeamBadge name={home.name} src={home.imageUrl} size={40}/><b>{home.shortName}</b></div><strong>{session.homeGoals}<i>×</i>{session.awayGoals}</strong><div style={{display:"grid",justifyItems:"center",gap:4}}><TeamBadge name={away.name} src={away.imageUrl} size={40}/><b>{away.shortName}</b></div></div>
      <div className={liveStyles.matchStats}><span>POSSE <b>{session.possessionHome}%</b>–<b>{100-session.possessionHome}%</b></span><span>CHUTES <b>{session.shotsHome}</b>–<b>{session.shotsAway}</b></span><span>xG <b>{session.xgHome.toFixed(2)}</b>–<b>{session.xgAway.toFixed(2)}</b></span><span>ESCANTEIOS <b>{session.cornersHome??0}</b>–<b>{session.cornersAway??0}</b></span></div>
      <div className={`${liveStyles.liveCommentary} ${goalFlash?liveStyles.goalFlash:""}`}><b>{latestEvent?.minute??0}′</b><span>{latestEvent?.type==="goal"?"⚽ ":latestEvent?.type==="card"?"🟨 ":latestEvent?.type==="red_card"?"🟥 ":latestEvent?.type==="injury"?"🩺 ":""}{latestEvent?.text??"Aguardando o início da partida."}{latestEvent?.type==="goal"&&latestEvent.assistPlayerId?<small>👟 {byId.get(latestEvent.assistPlayerId)?.name}</small>:null}</span></div>
      <div className={liveStyles.teamEventColumns}><TeamEvents club={home} score={session.homeGoals} events={homeEvents} byId={byId}/><TeamEvents club={away} score={session.awayGoals} events={awayEvents} byId={byId}/></div>
      <div className={liveStyles.momentum}><small>MOMENTUM • {momentum>25?`${userClub.shortName} domina`:momentum<-25?"adversário domina":"equilibrado"}</small><div><i/><em style={{left:momentum>=0?"50%":`${50+momentum/2}%`,width:`${Math.abs(momentum)/2}%`}}/></div></div>
      <div className={liveStyles.transport}>{session.phase==="pre_match"?<button className={liveStyles.primary} onClick={start}><Play size={15}/> COMEÇAR</button>:session.phase==="fulltime"?<button className={liveStyles.primary} disabled={finishing} onClick={finish}>{finishing?"PROCESSANDO...":"VER PÓS-JOGO"} <ChevronRight size={16}/></button>:session.phase!=="halftime"?<button className={liveStyles.playPause} disabled={required.length>0} onClick={()=>setRunning(value=>!value)}>{running?<><Pause size={15}/> PAUSAR</>:<><Play size={15}/> CONTINUAR</>}</button>:null}{session.phase!=="pre_match"&&session.phase!=="fulltime"&&<div className={liveStyles.speed}><Gauge size={15}/>{(["slow","normal","fast","very_fast"] as MatchSpeed[]).map(value=><button key={value} className={speed===value?liveStyles.speedActive:""} onClick={()=>setSpeed(value)}>{SPEED_LABEL[value]}</button>)}</div>}</div>
    </section>

    {session.phase!=="pre_match"&&parallelMatches.length>0&&<OtherScores matches={parallelMatches} minute={session.phase==="fulltime"?90:session.currentMinute}/>}    
    {required.length>0&&<div className={liveStyles.injuryStop}><ShieldAlert/><div><b>TROCA OBRIGATÓRIA</b><span>{required.map(id=>byId.get(id)?.name).filter(Boolean).join(", ")}</span></div></div>}

    {session.phase==="halftime"&&<section className={liveStyles.halftime}><div><Users/><h3>Conversa de intervalo</h3><p>A mensagem altera o momentum no começo do segundo tempo. Os demais jogos seguem atualizados abaixo.</p></div><div className={liveStyles.talks}>{(["Cobrar","Incentivar","Acalmar"] as TeamTalk[]).map(value=><button key={value} disabled={assistantTeamTalks} className={session.teamTalk===value?liveStyles.active:""} onClick={()=>onChange(setTeamTalk(session,value))}>{value}</button>)}</div><button className={liveStyles.primary} onClick={resume}>INICIAR 2º TEMPO</button></section>}

    <section className={liveStyles.matchGrid} style={{gridTemplateColumns:"1fr"}}><div className={liveStyles.controlColumn}>
      {gamePlans.length>0&&session.phase!=="fulltime"&&<div className={`${liveStyles.panel} ${liveStyles.gamePlans}`}><header><ClipboardList size={16}/><b>PLANOS DE JOGO</b><span>{currentScenario}</span></header><p>Troque a identidade tática inteira sem reconstruir as instruções.</p><div>{gamePlans.map(plan=><button key={plan.id} className={plan.scenario===currentScenario?liveStyles.planMatch:""} onClick={()=>applyGamePlan(plan)}><span>{plan.scenario}</span><b>{plan.name}</b><small>{plan.tactic.formation} • {plan.tactic.mentality}</small></button>)}</div></div>}
      {showStaffAdvice&&<div className={`${liveStyles.panel} ${liveStyles.staffPanel}`}><header><Lightbulb size={16}/><b>COMISSÃO</b></header>{staffGamePlan&&<div className={liveStyles.planAdvice}><span>PLANO SALVO • {currentScenario.toUpperCase()}</span><b>{staffGamePlan.name}</b><small>A comissão identificou esta situação de jogo e recomenda seu plano de {staffGamePlan.scenario.toLowerCase()}.</small><button onClick={()=>applyGamePlan(staffGamePlan)}>APLICAR PLANO</button></div>}<p>{advice}</p>{patch&&<button onClick={()=>change(patch)}>APLICAR AJUSTE</button>}{canSuggestSub&&suggestedOut&&suggestedIn&&<div className={liveStyles.subAdvice}><b>SUGESTÃO DE TROCA</b><span>Sair: {suggestedOut.player?.name} • Entrar: {suggestedIn.name}. {subReason}.</span><button onClick={()=>{setOutId(suggestedOut.id);setInId(suggestedIn.id)}}>PREPARAR TROCA</button></div>}</div>}
      <div className={liveStyles.panel}><header><ShieldAlert size={16}/><b>INSTRUÇÕES</b></header><Select label="Mentalidade" value={tactic.mentality} options={["Defensiva","Equilibrada","Ofensiva"] as Mentality[]} onChange={value=>change({mentality:value as Mentality})}/><Range label="Pressão" value={tactic.pressing} onChange={value=>change({pressing:value})}/><Range label="Ritmo" value={tactic.tempo} onChange={value=>change({tempo:value})}/><Select label="Ataque" value={tactic.attackFocus} options={["Equilibrado","Pelos lados","Por dentro","Esquerda","Direita"] as AttackFocus[]} onChange={value=>change({attackFocus:value as AttackFocus})}/><Select label="Linha defensiva" value={tactic.defensiveLine} options={["Baixa","Média","Alta"] as DefensiveLine[]} onChange={value=>change({defensiveLine:value as DefensiveLine})}/><Select label="Amplitude" value={tactic.width} options={["Estreita","Normal","Ampla"] as TeamWidth[]} onChange={value=>change({width:value as TeamWidth})}/><Select label="Construção" value={tactic.buildUp} options={["Curta","Mista","Direta"] as BuildUp[]} onChange={value=>change({buildUp:value as BuildUp})}/><Select label="Marcação" value={tactic.marking} options={["Zona","Individual","Mista"] as Marking[]} onChange={value=>change({marking:value as Marking})}/></div>
      <div className={liveStyles.panel}><header><ShieldAlert size={16}/><b>BOLAS PARADAS</b></header><Select label="Escanteio" value={tactic.setPieces.cornerAttack} options={["Primeiro pau","Segundo pau","Centro"] as SetPiecePost[]} onChange={value=>setPiece({cornerAttack:value as SetPiecePost})}/><Select label="Defesa" value={tactic.setPieces.cornerDefense} options={["Zona","Individual","Mista"]} onChange={value=>setPiece({cornerDefense:value as "Zona"|"Individual"|"Mista"})}/>{(["cornerTakerId","freeKickTakerId","penaltyTakerId","targetPlayerId"] as const).map((key,index)=><PlayerSelect key={key} label={["Escanteio","Falta","Pênalti","Alvo"][index]} value={tactic.setPieces[key]??""} ids={lineup} byId={byId} onChange={value=>setPiece({[key]:value||undefined})}/>)}</div>
      <div className={liveStyles.panel}><header><Repeat2 size={16}/><b>SUBSTITUIÇÕES {subs.length}/{session.maxSubstitutions}</b></header><div className={liveStyles.subRow}><label>SAI<select value={outId} onChange={event=>setOutId(event.target.value)}><option value="">Selecione</option>{lineup.map(id=>{const player=byId.get(id),state=session.playerStates[id];return <option key={id} value={id}>{player?.position} • {player?.name} • Nota {state?.rating.toFixed(1)??"6.0"} • Cond {state?.condition.toFixed(0)??player?.condition??100}%</option>})}</select></label><label>ENTRA<select value={inId} onChange={event=>setInId(event.target.value)}><option value="">Selecione</option>{bench.map(id=>{const player=byId.get(id),state=session.playerStates[id];return <option key={id} value={id}>{player?.position} • {player?.name} • OVR {player?.overall??"—"} • Cond {state?.condition.toFixed(0)??player?.condition??100}%</option>})}</select></label><button disabled={!outId||!inId} onClick={substitute}>TROCAR</button></div>{outId&&<div style={{marginTop:8,fontSize:12,opacity:.82}}>Selecionado para sair: <b>{byId.get(outId)?.name}</b> • nota <b>{session.playerStates[outId]?.rating.toFixed(1)??"6.0"}</b> • condição <b>{session.playerStates[outId]?.condition.toFixed(0)??byId.get(outId)?.condition??100}%</b></div>}</div>
    </div></section>
    <section className={liveStyles.panel}><header><b>NARRAÇÃO & ALTERAÇÕES TÁTICAS</b></header><div className={liveStyles.narrationList}>{session.events.slice().reverse().slice(0,30).map((event,index)=><div key={`${event.minute}-${index}`}><b>{event.minute}′</b><span>{event.text}</span></div>)}</div></section>
  </div>;
}

function TeamEvents({club,score,events,byId}:{club:LeagueClub;score:number;events:MatchEvent[];byId:Map<string,LeaguePlayer>}){return <section className={liveStyles.teamEventBlock}><header><span style={{display:"flex",alignItems:"center",gap:5}}><TeamBadge name={club.name} src={club.imageUrl} size={22}/><b>{club.shortName}</b></span><strong>{score}</strong></header><div>{events.length?events.map((event,index)=><article key={`${event.minute}-${event.type}-${index}`}><time>{event.minute}′</time><span className={liveStyles.eventIcon}>{event.type==="goal"?"⚽":event.type==="card"?"🟨":event.type==="red_card"?"🟥":"🩺"}</span><p><b>{event.playerId?byId.get(event.playerId)?.name:event.text}</b>{event.type==="goal"&&event.assistPlayerId?<small>👟 {byId.get(event.assistPlayerId)?.name}</small>:null}</p></article>):<small className={liveStyles.noEvents}>Sem eventos relevantes</small>}</div></section>}
function OtherScores({matches,minute}:{matches:MatchdayParallelMatch[];minute:number}){return <section className={liveStyles.otherScores}><header><div><Radio/><span>OUTROS JOGOS DA RODADA</span></div><b>{minute>=90?"FINAIS":`${minute}′`}</b></header><div>{matches.map(match=>{const score=scoreAtMinute(match.result,minute);return <article key={match.id}><span>{match.homeShort}</span><strong>{score.home}–{score.away}</strong><span>{match.awayShort}</span></article>})}</div></section>}
function MatchdayBrief({home,away,parallelMatches,news,social}:{home:LeagueClub;away:LeagueClub;parallelMatches:MatchdayParallelMatch[];news:MatchdayNews[];social:MatchdaySocial[]}){return <section className={liveStyles.matchdayBrief}><header><div><span>DIA DE JOGO</span><h2 style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><TeamBadge name={home.name} src={home.imageUrl} size={30}/>{home.shortName} × {away.shortName}<TeamBadge name={away.name} src={away.imageUrl} size={30}/></h2></div><small>Contexto da rodada antes da bola rolar</small></header><div className={liveStyles.briefGrid}><div className={liveStyles.roundBoard}><b>JOGOS DA RODADA</b><article className={liveStyles.ourFixture}><span style={{display:"flex",alignItems:"center",gap:5}}><TeamBadge name={home.name} src={home.imageUrl} size={22}/>{home.shortName}</span><strong>VS</strong><span style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>{away.shortName}<TeamBadge name={away.name} src={away.imageUrl} size={22}/></span></article>{parallelMatches.map(match=><article key={match.id}><span>{match.homeShort}</span><strong>×</strong><span>{match.awayShort}</span></article>)}</div><div className={liveStyles.preNews}><b>PRÉ-JOGO & NOTÍCIAS</b>{news.slice(0,4).map(item=><article key={item.id}><span>{item.source}</span><strong>{item.headline}</strong></article>)}{!news.length&&<small>Nenhuma manchete relevante antes desta partida.</small>}</div><div className={liveStyles.preSocial}><b>REDES SOCIAIS</b>{social.slice(0,4).map(item=><article key={item.id}><span>{item.platform} • {item.tag}</span><strong>{item.headline}</strong></article>)}{!social.length&&<small>A conversa nas redes ainda está tranquila.</small>}</div></div></section>}
function Select({label,value,options,onChange}:{label:string;value:string;options:readonly string[];onChange:(value:string)=>void}){return <label style={{display:"grid",gap:4,marginTop:8}}><span>{label}</span><select value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option key={option}>{option}</option>)}</select></label>}
function Range({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <label style={{display:"grid",gap:4,marginTop:8}}><span>{label} <b>{value}</b></span><input type="range" min="20" max="90" value={value} onChange={event=>onChange(Number(event.target.value))}/></label>}
function PlayerSelect({label,value,ids,byId,onChange}:{label:string;value:string;ids:string[];byId:Map<string,LeaguePlayer>;onChange:(value:string)=>void}){return <label style={{display:"grid",gap:4,marginTop:8}}><span>{label}</span><select value={value} onChange={event=>onChange(event.target.value)}><option value="">Automático</option>{ids.map(id=><option key={id} value={id}>{byId.get(id)?.position} • {byId.get(id)?.name}</option>)}</select></label>}
