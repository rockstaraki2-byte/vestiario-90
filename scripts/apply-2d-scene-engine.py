from pathlib import Path

root=Path('.')

scene='''import type { MatchEvent } from "./match";
import type { MatchSide } from "./live-match";

export type ScenePoint={x:number;y:number};
export type SceneActor={id:string;position:string;overall:number;base:ScenePoint;side:MatchSide};
export type SceneActionKind="pass"|"carry"|"cross"|"shot"|"goal"|"save"|"block"|"wide"|"interception"|"tackle"|"clearance"|"set_piece"|"restart";
export type SceneAction={kind:SceneActionKind;from:ScenePoint;to:ScenePoint;actorId?:string;receiverId?:string;defenderId?:string;duration:number;label:string;arc?:number};
export type MatchScenePlan={attackingSide:MatchSide;possessionSide:MatchSide;actions:SceneAction[];outcome:string};

const clamp=(v:number,min=3,max=97)=>Math.max(min,Math.min(max,v));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const attackY=(side:MatchSide,kind:"build"|"mid"|"create"|"shot"|"goal")=>side==="home"?({build:78,mid:57,create:30,shot:13,goal:2} as const)[kind]:({build:22,mid:43,create:70,shot:87,goal:98} as const)[kind];
const zoneX=(zone?:"left"|"center"|"right")=>zone==="left"?23:zone==="right"?77:50;
const other=(side:MatchSide):MatchSide=>side==="home"?"away":"home";

function scoreRole(actor:SceneActor,preferred:string[]){const index=preferred.indexOf(actor.position);return(index<0?0:100-index*18)+actor.overall*.15;}
function pick(actors:SceneActor[],preferred:string[],seed:string,exclude:string[]=[]){const pool=actors.filter(a=>!exclude.includes(a.id)).sort((a,b)=>scoreRole(b,preferred)-scoreRole(a,preferred)||b.overall-a.overall);if(!pool.length)return undefined;const top=pool.slice(0,Math.min(4,pool.length));return top[hash(seed)%top.length];}
function goalKeeper(defenders:SceneActor[]){return defenders.find(a=>a.position==="GOL")??defenders[0];}
function nearest(actors:SceneActor[],point:ScenePoint){return [...actors].sort((a,b)=>Math.hypot(a.base.x-point.x,a.base.y-point.y)-Math.hypot(b.base.x-point.x,b.base.y-point.y))[0];}
function approach(base:ScenePoint,x:number,y:number,t=.28):ScenePoint{return{x:clamp(mix(base.x,x,t)),y:clamp(mix(base.y,y,t))}}

export function buildMatchScene(event:MatchEvent|undefined,eventKey:string,defaultAttacking:MatchSide,homeActors:SceneActor[],awayActors:SceneActor[]):MatchScenePlan{
 const eventTeam=event?.team==="home"||event?.team==="away"?event.team:defaultAttacking;
 const defensiveEvent=event?.type==="interception"||event?.type==="tackle";
 const attackingSide=defensiveEvent?other(eventTeam):eventTeam;
 const possessionSide=defensiveEvent?eventTeam:attackingSide;
 const attackers=attackingSide==="home"?homeActors:awayActors,defenders=attackingSide==="home"?awayActors:homeActors;
 const focusX=zoneX(event?.zone),goal:ScenePoint={x:50,y:attackY(attackingSide,"goal")},keeper=goalKeeper(defenders);
 const eventActor=event?.playerId?[...homeActors,...awayActors].find(a=>a.id===event.playerId):undefined;
 const eventAssist=event?.assistPlayerId?[...homeActors,...awayActors].find(a=>a.id===event.assistPlayerId):undefined;
 const builder=pick(attackers,["GOL","ZAG","LE","LD","VOL"],eventKey+":builder",[eventActor?.id??""]);
 const pivot=pick(attackers,["VOL","MC","MEI","LE","LD"],eventKey+":pivot",[builder?.id??"",eventActor?.id??""]);
 const creator=eventAssist??pick(attackers,[event?.zone==="left"?"PE":event?.zone==="right"?"PD":"MEI","MEI","PE","PD","MC","LD","LE"],eventKey+":creator",[builder?.id??"",pivot?.id??"",eventActor?.id??""]);
 const finisher=eventActor??pick(attackers,["ATA","PE","PD","MEI"],eventKey+":finisher",[builder?.id??"",pivot?.id??""]);
 const buildPoint=builder?.base??{x:50,y:attackY(attackingSide,"build")};
 const pivotPoint=approach(pivot?.base??{x:50,y:attackY(attackingSide,"mid")},focusX,attackY(attackingSide,"mid"),.22);
 const creatorPoint=approach(creator?.base??{x:focusX,y:attackY(attackingSide,"create")},focusX,attackY(attackingSide,"create"),.46);
 const shotPoint=approach(finisher?.base??{x:focusX,y:attackY(attackingSide,"shot")},focusX,attackY(attackingSide,"shot"),.62);
 const actions:SceneAction[]=[];
 const add=(action:SceneAction)=>actions.push(action);
 const pass=(from:ScenePoint,to:ScenePoint,actorId:string|undefined,receiverId:string|undefined,label:string)=>add({kind:"pass",from,to,actorId,receiverId,duration:.55,label});

 if(!event||event.type==="kickoff"||event.type==="halftime"||event.type==="fulltime"||event.type==="tactical"){
   const lateral=pick(attackers,["MC","VOL","MEI","LE","LD"],eventKey+":circulate",[builder?.id??""]);
   const lateralPoint=lateral?.base??{x:62,y:attackY(attackingSide,"mid")};
   pass(buildPoint,pivotPoint,builder?.id,pivot?.id,"SAÍDA DE BOLA");
   pass(pivotPoint,lateralPoint,pivot?.id,lateral?.id,"CIRCULAÇÃO");
   pass(lateralPoint,pivotPoint,lateral?.id,pivot?.id,"APOIO");
   return{attackingSide,possessionSide:attackingSide,actions,outcome:"POSSE E CIRCULAÇÃO"};
 }

 if(event.type==="interception"||event.type==="tackle"){
   const defender=eventActor??nearest(defenders,pivotPoint),target=approach(defender?.base??pivotPoint,pivotPoint.x,pivotPoint.y,.5);
   pass(buildPoint,pivotPoint,builder?.id,pivot?.id,"TENTATIVA DE PROGRESSÃO");
   add({kind:event.type,from:pivotPoint,to:target,actorId:pivot?.id,defenderId:defender?.id,duration:.48,label:event.type==="interception"?"LEITURA E INTERCEPTAÇÃO":"BOTE E RECUPERAÇÃO"});
   add({kind:"clearance",from:target,to:approach(target,50,50,.45),actorId:defender?.id,duration:.5,label:"TRANSIÇÃO APÓS RECUPERAÇÃO"});
   return{attackingSide,possessionSide:eventTeam,actions,outcome:event.type==="interception"?"INTERCEPTAÇÃO":"DESARME"};
 }

 if(event.type==="corner"){
   const corner:ScenePoint={x:event.zone==="left"?4:event.zone==="right"?96:focusX,y:attackY(attackingSide,"goal")},box:ScenePoint={x:mix(focusX,50,.66),y:attackY(attackingSide,"shot")};
   add({kind:"set_piece",from:corner,to:box,actorId:eventActor?.id,receiverId:finisher?.id,duration:.8,label:"ESCANTEIO",arc:13});
   add({kind:"clearance",from:box,to:{x:50,y:attackY(attackingSide,"mid")},defenderId:nearest(defenders,box)?.id,duration:.6,label:"DISPUTA NA ÁREA",arc:6});
   return{attackingSide,possessionSide:attackingSide,actions,outcome:"BOLA PARADA"};
 }
 if(event.type==="free_kick"||event.type==="penalty"){
   const start:ScenePoint={x:event.type==="penalty"?50:focusX,y:attackY(attackingSide,"shot")};
   add({kind:"set_piece",from:start,to:goal,actorId:eventActor?.id,defenderId:keeper?.id,duration:1.05,label:event.type==="penalty"?"PÊNALTI":"FALTA DIRETA",arc:event.type==="free_kick"?9:2});
   return{attackingSide,possessionSide:attackingSide,actions,outcome:event.type==="penalty"?"PÊNALTI":"BOLA PARADA"};
 }
 if(event.type==="card"||event.type==="red_card"||event.type==="injury"){
   const stop=eventActor?.base??{x:50,y:50};
   add({kind:"restart",from:stop,to:stop,actorId:eventActor?.id,duration:1.3,label:"JOGO PARADO"});
   return{attackingSide,possessionSide:attackingSide,actions,outcome:"JOGO PARADO"};
 }

 pass(buildPoint,pivotPoint,builder?.id,pivot?.id,"CONSTRUÇÃO");
 const wideCreator=creator&&["PE","PD","LE","LD"].includes(creator.position),wideZone=event.zone==="left"||event.zone==="right";
 if(pivot&&creator&&pivot.id!==creator.id)pass(pivotPoint,creatorPoint,pivot.id,creator.id,"PROGRESSÃO");
 if(wideZone&&wideCreator){
   add({kind:"carry",from:creatorPoint,to:{x:focusX,y:attackY(attackingSide,"create")},actorId:creator?.id,duration:.5,label:"CONDUÇÃO PELO CORREDOR"});
   add({kind:"cross",from:{x:focusX,y:attackY(attackingSide,"create")},to:shotPoint,actorId:creator?.id,receiverId:finisher?.id,duration:.75,label:"CRUZAMENTO",arc:12});
 }else if(creator&&finisher&&creator.id!==finisher.id){
   pass(creatorPoint,shotPoint,creator.id,finisher.id,"PASSE ENTRELINHAS");
 }else add({kind:"carry",from:creatorPoint,to:shotPoint,actorId:finisher?.id,duration:.65,label:"CONDUÇÃO PARA FINALIZAR"});

 if(event.type==="goal"){
   add({kind:"goal",from:shotPoint,to:goal,actorId:finisher?.id,defenderId:keeper?.id,duration:.72,label:"FINALIZAÇÃO • GOL",arc:3});
   return{attackingSide,possessionSide:attackingSide,actions,outcome:"GOL"};
 }
 const outcomeRoll=hash(eventKey+":outcome")%100;
 if(outcomeRoll<52){
   const savePoint:ScenePoint={x:clamp(50+(focusX-50)*.18,43,57),y:clamp(goal.y+(attackingSide==="home"?3:-3),3,97)};
   add({kind:"shot",from:shotPoint,to:savePoint,actorId:finisher?.id,defenderId:keeper?.id,duration:.65,label:"FINALIZAÇÃO",arc:2});
   add({kind:"save",from:savePoint,to:keeper?.base??savePoint,defenderId:keeper?.id,duration:.45,label:"DEFESA DO GOLEIRO"});
   return{attackingSide,possessionSide:other(attackingSide),actions,outcome:"DEFESA"};
 }
 if(outcomeRoll<82){
   const blocker=nearest(defenders,shotPoint),blockPoint=approach(blocker?.base??shotPoint,shotPoint.x,shotPoint.y,.6);
   add({kind:"shot",from:shotPoint,to:blockPoint,actorId:finisher?.id,defenderId:blocker?.id,duration:.55,label:"FINALIZAÇÃO"});
   add({kind:"block",from:blockPoint,to:{x:clamp(blockPoint.x+(hash(eventKey)%2?8:-8)),y:clamp(blockPoint.y+(attackingSide==="home"?7:-7))},defenderId:blocker?.id,duration:.42,label:"BLOQUEIO"});
   return{attackingSide,possessionSide:other(attackingSide),actions,outcome:"BLOQUEIO"};
 }
 const wideGoal={x:focusX<50?38:62,y:goal.y};
 add({kind:"wide",from:shotPoint,to:wideGoal,actorId:finisher?.id,duration:.72,label:"FINALIZAÇÃO PARA FORA",arc:3});
 return{attackingSide,possessionSide:other(attackingSide),actions,outcome:"PARA FORA"};
}

export function sceneActionAt(plan:MatchScenePlan,elapsed:number){
 const total=plan.actions.reduce((sum,a)=>sum+a.duration,0)||1,loop=Math.max(0,elapsed)%total;let cursor=0;
 for(let index=0;index<plan.actions.length;index++){const action=plan.actions[index],end=cursor+action.duration;if(loop<=end||index===plan.actions.length-1)return{action,index,progress:Math.max(0,Math.min(1,(loop-cursor)/action.duration)),total};cursor=end;}
 return{action:plan.actions[0],index:0,progress:0,total};
}

export function scenePoint(action:SceneAction,progress:number):ScenePoint{
 const t=progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2,x=action.from.x+(action.to.x-action.from.x)*t,y=action.from.y+(action.to.y-action.from.y)*t;
 const arc=action.arc??0;return{x,y:y-Math.sin(Math.PI*t)*arc};
}
'''
(root/'src/game-engine/match-2d-scene.ts').write_text(scene)

test='''import { describe,expect,it } from "vitest";
import { buildMatchScene,sceneActionAt } from "./match-2d-scene";
import type { SceneActor } from "./match-2d-scene";

const side=(name:"home"|"away",flip=false):SceneActor[]=>[
 {id:`${name}-gk`,position:"GOL",overall:75,side:name,base:{x:50,y:flip?8:92}},
 {id:`${name}-cb`,position:"ZAG",overall:74,side:name,base:{x:48,y:flip?24:76}},
 {id:`${name}-dm`,position:"VOL",overall:76,side:name,base:{x:46,y:flip?42:58}},
 {id:`${name}-cm`,position:"MC",overall:77,side:name,base:{x:52,y:flip?52:48}},
 {id:`${name}-lw`,position:"PE",overall:80,side:name,base:{x:22,y:flip?72:28}},
 {id:`${name}-am`,position:"MEI",overall:81,side:name,base:{x:50,y:flip?68:32}},
 {id:`${name}-st`,position:"ATA",overall:83,side:name,base:{x:50,y:flip?84:16}},
];

describe("2D scene engine",()=>{
 it("builds a linked passing sequence ending in a goal",()=>{const plan=buildMatchScene({minute:30,type:"goal",team:"home",text:"gol",playerId:"home-st",assistPlayerId:"home-lw",zone:"left",xg:.3},"goal-1","home",side("home"),side("away",true));expect(plan.actions.some(a=>a.kind==="pass")).toBe(true);expect(plan.actions.some(a=>a.kind==="cross")).toBe(true);expect(plan.actions.at(-1)?.kind).toBe("goal");});
 it("turns a defensive stat into visible possession recovery",()=>{const plan=buildMatchScene({minute:41,type:"interception",team:"away",text:"corte",playerId:"away-dm"},"int-1","home",side("home"),side("away",true));expect(plan.attackingSide).toBe("home");expect(plan.possessionSide).toBe("away");expect(plan.actions.some(a=>a.kind==="interception")).toBe(true);});
 it("keeps scene sequencing deterministic",()=>{const event={minute:50,type:"chance" as const,team:"home" as const,text:"chance",playerId:"home-st",zone:"center" as const,xg:.2};const a=buildMatchScene(event,"same-key","home",side("home"),side("away",true)),b=buildMatchScene(event,"same-key","home",side("home"),side("away",true));expect(a).toEqual(b);expect(sceneActionAt(a,.2).action).toBeDefined();});
});
'''
(root/'src/game-engine/match-2d-scene.test.ts').write_text(test)

match=root/'src/game-engine/match.ts'
s=match.read_text()
s=s.replace('"penalty"|"tactical";', '"penalty"|"tactical"|"interception"|"tackle";')
match.write_text(s)

live=root/'src/game-engine/live-match.ts'
s=live.read_text()
needle='const events:MatchEvent[]=[],injured=[...s.injuredPlayerIds],sent=[...s.sentOffPlayerIds],homeZones={...zones(s.homeAttackZones)},awayZones={...zones(s.awayAttackZones)},homeHeat={...heat(s.homeHeatmap)},awayHeat={...heat(s.awayHeatmap)};let homeThreat=0,awayThreat=0;'
replacement='''const events:MatchEvent[]=[],injured=[...s.injuredPlayerIds],sent=[...s.sentOffPlayerIds],homeZones={...zones(s.homeAttackZones)},awayZones={...zones(s.awayAttackZones)},homeHeat={...heat(s.homeHeatmap)},awayHeat={...heat(s.awayHeatmap)};let homeThreat=0,awayThreat=0;
 const visualRng=new SeededRng(`${s.seed}:visual-def:${minute}`),defensiveEvent=(side:MatchSide,type:"interception"|"tackle")=>{const xi=side==="home"?homeXI:awayXI,club=side==="home"?home:away,pool=rolePool(xi,["ZAG","VOL","MC","LE","LD"]);if(!pool.length)return;const player=visualRng.pick(pool);events.push({minute,type,team:side,playerId:player.id,text:type==="interception"?`${player.name} lê a jogada e intercepta para ${club.shortName}.`:`${player.name} entra no tempo certo e recupera a posse para ${club.shortName}.`});};
 if(interceptionsHome>s.interceptionsHome)defensiveEvent("home","interception");if(interceptionsAway>s.interceptionsAway)defensiveEvent("away","interception");if(tacklesHome>s.tacklesHome)defensiveEvent("home","tackle");if(tacklesAway>s.tacklesAway)defensiveEvent("away","tackle");'''
if needle not in s: raise SystemExit('live-match insertion needle not found')
s=s.replace(needle,replacement)
live.write_text(s)

pitch='''"use client";
import{useEffect,useMemo,useRef,useState}from"react";
import type{LeagueClub,LeaguePlayer}from"@/game-engine/league";
import type{LiveMatchState,MatchSide}from"@/game-engine/live-match";
import{layoutLineup}from"@/game-engine/tactics-layout";
import{buildMatchScene,sceneActionAt,scenePoint,type SceneActor,type ScenePoint}from"@/game-engine/match-2d-scene";
import styles from"./match-2d-pitch.module.css";

type RawActor=SceneActor&{player:LeaguePlayer};
const clamp=(v:number,min=3,max=97)=>Math.max(min,Math.min(max,v)),mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function phaseLabel(kind:string){return kind==="pass"?"PASSE":kind==="carry"?"CONDUÇÃO":kind==="cross"?"CRUZAMENTO":kind==="shot"?"FINALIZAÇÃO":kind==="goal"?"GOL":kind==="save"?"DEFESA":kind==="block"?"BLOQUEIO":kind==="wide"?"PARA FORA":kind==="interception"?"INTERCEPTAÇÃO":kind==="tackle"?"DESARME":kind==="clearance"?"TRANSIÇÃO":"BOLA PARADA"}
function eventLabel(type?:string){return type==="goal"?"CHANCE CLARA":type==="chance"?"ATAQUE":type==="corner"?"ESCANTEIO":type==="free_kick"?"FALTA":type==="penalty"?"PÊNALTI":type==="interception"?"RECUPERAÇÃO":type==="tackle"?"DESARME":type==="card"?"CARTÃO":type==="red_card"?"EXPULSÃO":type==="injury"?"ATENDIMENTO":"JOGO CORRIDO"}
export default function Match2DPitch({session,home,away}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub}){
 const[now,setNow]=useState(0),[sceneStart,setSceneStart]=useState(0),raf=useRef<number|undefined>(undefined),lastPaint=useRef(0),event=session.events[session.events.length-1],eventKey=`${event?.minute}:${event?.type}:${event?.team}:${event?.playerId??""}:${event?.assistPlayerId??""}:${session.homeGoals}-${session.awayGoals}`;
 useEffect(()=>{let first=true;const loop=(ts:number)=>{if(first){first=false;setSceneStart(ts)}if(ts-lastPaint.current>32){lastPaint.current=ts;setNow(ts)}raf.current=requestAnimationFrame(loop)};raf.current=requestAnimationFrame(loop);return()=>{if(raf.current)cancelAnimationFrame(raf.current)}},[eventKey,session.phase]);
 const byId=useMemo(()=>new Map([...home.players,...away.players].map(p=>[p.id,p])),[home,away]),layouts=(side:MatchSide,ids:string[],formation:string):RawActor[]=>layoutLineup(ids.map(id=>byId.get(id)).filter((p):p is LeaguePlayer=>Boolean(p)),formation as never).map(({player,slot})=>({id:player.id,player,position:player.position,overall:player.overall,side,base:{x:side==="home"?slot.x:100-slot.x,y:side==="home"?8+slot.y*.78:92-slot.y*.78}})),homeRaw=layouts("home",session.homeLineupIds,session.homeTactic.formation),awayRaw=layouts("away",session.awayLineupIds,session.awayTactic.formation),defaultAttacking:MatchSide=session.possessionHome>=50?"home":"away",plan=buildMatchScene(event,eventKey,defaultAttacking,homeRaw,awayRaw),elapsed=Math.max(0,(now-sceneStart)/1000),scene=sceneActionAt(plan,elapsed),ball=scenePoint(scene.action,scene.progress),raw=[...homeRaw,...awayRaw],defendingSide:MatchSide=plan.attackingSide==="home"?"away":"home",pressers=new Set(raw.filter(v=>v.side===defendingSide).sort((a,b)=>Math.hypot(a.base.x-ball.x,a.base.y-ball.y)-Math.hypot(b.base.x-ball.x,b.base.y-ball.y)).slice(0,2).map(v=>v.id));
 const markerPoint=(v:RawActor):ScenePoint=>{let{x,y}=v.base;const action=scene.action,teamHasBall=v.side===plan.attackingSide,dir=v.side==="home"?-1:1;if(teamHasBall){y=clamp(y+dir*3.2);x=clamp(mix(x,ball.x,.035));}else{x=clamp(mix(x,ball.x,pressers.has(v.id)?.22:.07));y=clamp(mix(y,ball.y,pressers.has(v.id)?.16:.05));}if(v.id===action.actorId){x=mix(action.from.x,action.to.x,Math.min(.82,scene.progress*.72));y=mix(action.from.y,action.to.y,Math.min(.82,scene.progress*.72));}if(v.id===action.receiverId){x=mix(v.base.x,action.to.x,.76);y=mix(v.base.y,action.to.y,.76);}if(v.id===action.defenderId){const reaction=action.kind==="save"||action.kind==="block"||action.kind==="interception"||action.kind==="tackle"?.88:.48;x=mix(v.base.x,action.to.x,reaction*scene.progress);y=mix(v.base.y,action.to.y,reaction*scene.progress);}return{x:clamp(x),y:clamp(y)}};
 const markerRole=(v:RawActor)=>v.id===scene.action.actorId?"actor":v.id===scene.action.receiverId?"receiver":v.id===scene.action.defenderId?"defender":pressers.has(v.id)?"presser":"normal",trailFrom=scene.action.from,trailTo=scene.action.to,dx=trailTo.x-trailFrom.x,dy=trailTo.y-trailFrom.y,trailLength=Math.hypot(dx,dy),trailAngle=Math.atan2(dy,dx)*180/Math.PI,finished=scene.progress>.93;
 return <section className={styles.wrap}><header><div><span>MOTOR 2D • SCENE ENGINE</span><b>{session.currentMinute}′ • {eventLabel(event?.type)}</b></div><div className={styles.phase}><i/>{phaseLabel(scene.action.kind)} • {scene.action.label}</div></header><div className={`${styles.pitch} ${event?.type==="goal"&&finished?styles.goalScene:""}`}><i className={styles.half}/><i className={styles.circle}/><i className={`${styles.box} ${styles.topBox}`}/><i className={`${styles.box} ${styles.bottomBox}`}/><i className={`${styles.goal} ${styles.topGoal}`}/><i className={`${styles.goal} ${styles.bottomGoal}`}/><div className={styles.trail} style={{left:`${trailFrom.x}%`,top:`${trailFrom.y}%`,width:`${trailLength}%`,transform:`rotate(${trailAngle}deg)`}}/>{raw.map(v=>{const p=markerPoint(v),role=markerRole(v);return <div key={v.id} className={`${styles.player} ${v.side==="home"?styles.home:styles.away} ${role==="actor"?styles.onBall:role==="receiver"?styles.receiver:role==="defender"?styles.defender:role==="presser"?styles.presser:""}`} style={{transform:`translate3d(${p.x}cqw,${p.y}cqh,0) translate(-50%,-50%)`}}><b>{v.player.position}</b><span>{v.player.name.split(" ")[0]}</span></div>})}<div className={`${styles.ball} ${(scene.action.kind==="cross"||scene.action.kind==="shot"||scene.action.kind==="goal"||scene.action.kind==="set_piece")?styles.ballFlight:""}`} style={{transform:`translate3d(${ball.x}cqw,${ball.y}cqh,0) translate(-50%,-50%)`}}/><div className={styles.focusRing} style={{transform:`translate3d(${ball.x}cqw,${ball.y}cqh,0) translate(-50%,-50%)`}}/><div className={styles.actionTag}>{scene.index+1}/{plan.actions.length} • {scene.action.label}</div>{event&&event.minute===session.currentMinute&&<div className={styles.commentary}><b>{event.minute}′</b><span>{event.text}</span></div>}{event?.type==="goal"&&finished&&<div className={styles.eventBadge}>⚽ {byId.get(event.playerId??"")?.name??"GOL"}</div>}{(event?.type==="interception"||event?.type==="tackle")&&finished&&<div className={styles.eventBadge}>↺ {plan.outcome}</div>}</div></section>
}
'''
(root/'src/app/match-2d-pitch.tsx').write_text(pitch)

css=root/'src/app/match-2d-pitch.module.css'
s=css.read_text()
s=s.replace('.assistant{box-shadow:0 0 0 4px rgba(78,190,255,.28),0 4px 12px #000;z-index:7}.support{', '.receiver{box-shadow:0 0 0 4px rgba(78,190,255,.28),0 4px 12px #000;z-index:7}.defender{box-shadow:0 0 0 4px rgba(255,94,94,.2),0 4px 12px #000;z-index:7}.presser{box-shadow:0 0 0 2px rgba(255,255,255,.18),0 3px 9px rgba(0,0,0,.35)}.support{')
s=s.replace('.onBall span,.assistant span{opacity:1}', '.onBall span,.receiver span,.defender span{opacity:1}')
s=s.replace('.ball{position:absolute;', '.trail{position:absolute;height:1px;transform-origin:0 50%;border-top:1px dashed rgba(255,255,255,.18);z-index:2;pointer-events:none}.actionTag{position:absolute;right:10px;top:10px;z-index:12;padding:4px 7px;border-radius:7px;background:rgba(4,13,9,.55);font-size:8px;font-weight:900;letter-spacing:.06em}.ball{position:absolute;')
s=s.replace('.focusRing{position:absolute;', '.ballFlight{box-shadow:0 0 10px rgba(255,255,255,.98),0 4px 8px rgba(0,0,0,.35)}.focusRing{position:absolute;')
css.write_text(s)
