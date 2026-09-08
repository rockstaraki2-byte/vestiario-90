import type { MatchEvent } from "./match";
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
