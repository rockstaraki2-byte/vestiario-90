"use client";
import { useEffect, useRef, useState } from "react";
import type { LeagueClub, LeaguePlayer } from "@/game-engine/league";
import type { LiveMatchState, MatchSide } from "@/game-engine/live-match";
import { layoutLineup } from "@/game-engine/tactics-layout";
import { buildMatchScene, sceneActionAt, scenePoint, type SceneActor } from "@/game-engine/match-2d-scene";
import styles from "./match-2d-pitch.module.css";

type RawActor = SceneActor & { player: LeaguePlayer };
type RenderSnapshot = {
  eventKey: string;
  sceneStart: number;
  minute: number;
  eventText?: string;
  eventType?: string;
  plan: ReturnType<typeof buildMatchScene>;
  actors: RawActor[];
};
type PhaserBridge = { snapshot: RenderSnapshot };
type PhaserGame = { destroy: (removeCanvas?: boolean) => void };

const clamp=(v:number,min=3,max=97)=>Math.max(min,Math.min(max,v));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const px=(v:number,size:number)=>v/100*size;

function makeActors(session:LiveMatchState,home:LeagueClub,away:LeagueClub){
 const byId=new Map([...home.players,...away.players].map(p=>[p.id,p]));
 const make=(side:MatchSide,ids:string[],formation:string):RawActor[]=>layoutLineup(ids.map(id=>byId.get(id)).filter((p):p is LeaguePlayer=>Boolean(p)),formation as never).map(({player,slot})=>({id:player.id,player,position:player.position,overall:player.overall,side,base:{x:side==="home"?slot.x:100-slot.x,y:side==="home"?8+slot.y*.78:92-slot.y*.78}}));
 return [...make("home",session.homeLineupIds,session.homeTactic.formation),...make("away",session.awayLineupIds,session.awayTactic.formation)];
}

function snapshot(session:LiveMatchState,home:LeagueClub,away:LeagueClub,started=performance.now()):RenderSnapshot{
 const event=session.events[session.events.length-1];
 const eventKey=`${event?.minute}:${event?.type}:${event?.team}:${event?.playerId??""}:${event?.assistPlayerId??""}:${session.homeGoals}-${session.awayGoals}`;
 const actors=makeActors(session,home,away);
 const defaultAttacking:MatchSide=session.possessionHome>=50?"home":"away";
 return {eventKey,sceneStart:started,minute:session.currentMinute,eventText:event?.text,eventType:event?.type,plan:buildMatchScene(event,eventKey,defaultAttacking,actors.filter(a=>a.side==="home"),actors.filter(a=>a.side==="away")),actors};
}

export default function PhaserMatchRenderer({session,home,away,onFailure}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub;onFailure:()=>void}){
 const host=useRef<HTMLDivElement|null>(null),game=useRef<PhaserGame|null>(null),bridge=useRef<PhaserBridge>({snapshot:snapshot(session,home,away)}),[ready,setReady]=useState(false);
 const event=session.events[session.events.length-1],eventKey=`${event?.minute}:${event?.type}:${event?.team}:${event?.playerId??""}:${event?.assistPlayerId??""}:${session.homeGoals}-${session.awayGoals}`;
 useEffect(()=>{const prev=bridge.current.snapshot;bridge.current.snapshot=snapshot(session,home,away,prev.eventKey===eventKey?prev.sceneStart:performance.now())},[session,home,away,eventKey]);
 useEffect(()=>{let disposed=false;if(!host.current)return;void import("phaser").then(Phaser=>{if(disposed||!host.current)return;const parent=host.current;class MatchScene extends Phaser.Scene{
   playerObjects=new Map<string,{dot:Phaser.GameObjects.Arc;label:Phaser.GameObjects.Text}>();visualPositions=new Map<string,{x:number;y:number}>();ballVisual?:{x:number;y:number};ball?:Phaser.GameObjects.Arc;trail?:Phaser.GameObjects.Graphics;actionText?:Phaser.GameObjects.Text;lastSize="";
   create(){this.drawPitch();this.ball=this.add.circle(0,0,5,0xffffff).setStrokeStyle(1,0x111111,1).setDepth(20);this.trail=this.add.graphics().setDepth(3);this.actionText=this.add.text(14,12,"",{fontFamily:"Arial",fontSize:"12px",fontStyle:"bold",color:"#ffffff",backgroundColor:"rgba(2,10,7,.62)",padding:{x:7,y:4}}).setDepth(30);this.syncPlayers();setReady(true)}
   drawPitch(){const w=this.scale.width,h=this.scale.height,g=this.add.graphics().setDepth(0);g.fillStyle(0x174a31,1);g.fillRect(0,0,w,h);g.lineStyle(1,0xffffff,.38);g.strokeRect(w*.035,h*.035,w*.93,h*.93);g.lineBetween(w*.035,h*.5,w*.965,h*.5);g.strokeCircle(w*.5,h*.5,Math.min(w,h)*.09);g.strokeRect(w*.30,h*.035,w*.40,h*.15);g.strokeRect(w*.30,h*.815,w*.40,h*.15);g.strokeRect(w*.43,0,w*.14,h*.035);g.strokeRect(w*.43,h*.965,w*.14,h*.035);for(let i=1;i<12;i++){g.fillStyle(i%2?0xffffff:0x000000,.018);g.fillRect(w*.035,h*(.035+i*.0775),w*.93,h*.0775)}}
   syncPlayers(){for(const a of bridge.current.snapshot.actors){if(this.playerObjects.has(a.id))continue;const color=a.side==="home"?0x16a264:0x28334a,dot=this.add.circle(0,0,12,color).setStrokeStyle(2,0xffffff,.9).setDepth(10),label=this.add.text(0,0,a.player.name.split(" ")[0],{fontFamily:"Arial",fontSize:"9px",fontStyle:"bold",color:"#ffffff",stroke:"#000000",strokeThickness:2}).setOrigin(.5,0).setDepth(11);this.playerObjects.set(a.id,{dot,label})}}
   update(time:number){const snap=bridge.current.snapshot,w=this.scale.width,h=this.scale.height,size=`${w}x${h}`;if(size!==this.lastSize){this.lastSize=size;this.children.removeAll(true);this.playerObjects.clear();this.drawPitch();this.ball=this.add.circle(0,0,5,0xffffff).setStrokeStyle(1,0x111111,1).setDepth(20);this.trail=this.add.graphics().setDepth(3);this.actionText=this.add.text(14,12,"",{fontFamily:"Arial",fontSize:"12px",fontStyle:"bold",color:"#ffffff",backgroundColor:"rgba(2,10,7,.62)",padding:{x:7,y:4}}).setDepth(30);this.syncPlayers()}this.syncPlayers();const elapsed=Math.max(0,(time-snap.sceneStart)/1000),current=sceneActionAt(snap.plan,elapsed),p=scenePoint(current.action,current.progress),defSide:MatchSide=snap.plan.attackingSide==="home"?"away":"home",pressers=new Set(snap.actors.filter(a=>a.side===defSide).sort((a,b)=>Math.hypot(a.base.x-p.x,a.base.y-p.y)-Math.hypot(b.base.x-p.x,b.base.y-p.y)).slice(0,2).map(a=>a.id));
    for(const a of snap.actors){const o=this.playerObjects.get(a.id);if(!o)continue;let{x,y}=a.base;const hasBall=a.side===snap.plan.attackingSide,dir=a.side==="home"?-1:1;if(hasBall){y=clamp(y+dir*3);x=clamp(mix(x,p.x,.04))}else{x=clamp(mix(x,p.x,pressers.has(a.id)?.24:.07));y=clamp(mix(y,p.y,pressers.has(a.id)?.17:.05))}if(a.id===current.action.actorId){x=mix(current.action.from.x,current.action.to.x,Math.min(.84,current.progress*.75));y=mix(current.action.from.y,current.action.to.y,Math.min(.84,current.progress*.75))}if(a.id===current.action.receiverId){x=mix(a.base.x,current.action.to.x,.78);y=mix(a.base.y,current.action.to.y,.78)}if(a.id===current.action.defenderId){const r=["save","block","interception","tackle"].includes(current.action.kind)?.9:.5;x=mix(a.base.x,current.action.to.x,r*current.progress);y=mix(a.base.y,current.action.to.y,r*current.progress)}const target={x,y},visual=this.visualPositions.get(a.id)??target;const frame=Math.min(1,Math.max(.035,(this.game.loop.delta||16)/1000));const ease=1-Math.pow(.001,frame);visual.x=mix(visual.x,target.x,ease);visual.y=mix(visual.y,target.y,ease);this.visualPositions.set(a.id,visual);const X=px(visual.x,w),Y=px(visual.y,h);o.dot.setPosition(X,Y);o.label.setPosition(X,Y+14);const active=a.id===current.action.actorId,receiver=a.id===current.action.receiverId,defender=a.id===current.action.defenderId;o.dot.setScale(active?1.28:receiver||defender?1.14:1);o.dot.setAlpha(1)}
    const ballTarget={x:p.x,y:p.y},ballVisual=this.ballVisual??ballTarget;const ballFrame=Math.min(1,Math.max(.035,(this.game.loop.delta||16)/1000)),ballEase=1-Math.pow(.00008,ballFrame);ballVisual.x=mix(ballVisual.x,ballTarget.x,ballEase);ballVisual.y=mix(ballVisual.y,ballTarget.y,ballEase);this.ballVisual=ballVisual;this.ball?.setPosition(px(ballVisual.x,w),px(ballVisual.y,h));this.trail?.clear();this.trail?.lineStyle(2,0xffffff,.16);this.trail?.lineBetween(px(ballVisual.x,w),px(ballVisual.y,h),px(mix(ballVisual.x,current.action.to.x,.45),w),px(mix(ballVisual.y,current.action.to.y,.45),h));this.actionText?.setText(`${snap.minute}′  ${current.index+1}/${snap.plan.actions.length}  ${current.action.label}`)}
  }
  game.current=new Phaser.Game({type:Phaser.AUTO,parent,width:960,height:620,backgroundColor:"#174a31",transparent:false,antialias:true,scene:MatchScene,scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},render:{pixelArt:false,antialias:true}}) as unknown as PhaserGame;
 }).catch(()=>{if(!disposed)onFailure()});return()=>{disposed=true;game.current?.destroy(true);game.current=null}},[onFailure]);
 return <div className={styles.phaserShell}><div ref={host} className={styles.phaserHost}/>{!ready&&<div className={styles.phaserLoading}>CARREGANDO MOTOR 2D...</div>}{event&&event.minute===session.currentMinute&&<div className={styles.phaserCommentary}><b>{event.minute}′</b><span>{event.text}</span></div>}</div>
}
