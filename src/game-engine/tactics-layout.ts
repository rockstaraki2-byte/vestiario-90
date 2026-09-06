import type { LeaguePlayer } from "./league";
import type { Formation } from "./match";
import type{TacticalPoint}from"./tactical-position";

export type TacticalSlot={id:string;label:string;x:number;y:number;preferred:string[]};
export type TacticalAssignment={slot:TacticalSlot;player:LeaguePlayer};
export type TacticalPlayerPlacement={player:LeaguePlayer;point:TacticalPoint;label:string;manual:boolean};

const BACK_LINE=[
 {id:"lb",label:"LE",x:16,y:70,preferred:["LE","ZAG","VOL"]},
 {id:"lcb",label:"ZAG",x:38,y:75,preferred:["ZAG","LE","LD"]},
 {id:"rcb",label:"ZAG",x:62,y:75,preferred:["ZAG","LD","LE"]},
 {id:"rb",label:"LD",x:84,y:70,preferred:["LD","ZAG","VOL"]},
] satisfies TacticalSlot[];

const FORMATIONS:Record<Formation,TacticalSlot[]>={
 "4-2-3-1":[
  {id:"gk",label:"GOL",x:50,y:91,preferred:["GOL"]},...BACK_LINE,
  {id:"ldm",label:"VOL",x:38,y:54,preferred:["VOL","MC","MEI"]},
  {id:"rdm",label:"VOL",x:62,y:54,preferred:["VOL","MC","MEI"]},
  {id:"lw",label:"PE",x:20,y:32,preferred:["PE","PD","MEI","ATA"]},
  {id:"am",label:"MEI",x:50,y:38,preferred:["MEI","MC","ATA","PE","PD"]},
  {id:"rw",label:"PD",x:80,y:32,preferred:["PD","PE","MEI","ATA"]},
  {id:"st",label:"ATA",x:50,y:14,preferred:["ATA","PE","PD","MEI"]},
 ],
 "4-3-3":[
  {id:"gk",label:"GOL",x:50,y:91,preferred:["GOL"]},...BACK_LINE,
  {id:"lcm",label:"MC",x:27,y:51,preferred:["MC","VOL","MEI"]},
  {id:"dm",label:"VOL",x:50,y:58,preferred:["VOL","MC","MEI"]},
  {id:"rcm",label:"MC",x:73,y:51,preferred:["MC","MEI","VOL"]},
  {id:"lw",label:"PE",x:20,y:26,preferred:["PE","PD","ATA","MEI"]},
  {id:"st",label:"ATA",x:50,y:14,preferred:["ATA","PE","PD"]},
  {id:"rw",label:"PD",x:80,y:26,preferred:["PD","PE","ATA","MEI"]},
 ],
 "4-4-2":[
  {id:"gk",label:"GOL",x:50,y:91,preferred:["GOL"]},...BACK_LINE,
  {id:"lm",label:"PE",x:17,y:47,preferred:["PE","MC","MEI","LE"]},
  {id:"lcm",label:"MC",x:40,y:53,preferred:["MC","VOL","MEI"]},
  {id:"rcm",label:"MC",x:60,y:53,preferred:["MC","VOL","MEI"]},
  {id:"rm",label:"PD",x:83,y:47,preferred:["PD","MC","MEI","LD"]},
  {id:"lst",label:"ATA",x:38,y:17,preferred:["ATA","PE","PD","MEI"]},
  {id:"rst",label:"ATA",x:62,y:17,preferred:["ATA","PD","PE","MEI"]},
 ],
};

function fitScore(player:LeaguePlayer,slot:TacticalSlot){const idx=slot.preferred.indexOf(player.position),positionScore=idx===0?100:idx===1?72:idx===2?48:idx===3?28:4;return positionScore+player.overall*.15+player.condition*.03;}
export function formationSlots(formation:Formation){return FORMATIONS[formation];}
export function layoutLineup(players:LeaguePlayer[],formation:Formation):TacticalAssignment[]{const remaining=[...players],assignments:TacticalAssignment[]=[];for(const slot of FORMATIONS[formation]){if(!remaining.length)break;let bestIndex=0,best=-Infinity;remaining.forEach((player,index)=>{const score=fitScore(player,slot);if(score>best){best=score;bestIndex=index}});const[player]=remaining.splice(bestIndex,1);assignments.push({slot,player});}return assignments;}
export function defaultTacticalPositions(players:LeaguePlayer[],formation:Formation){return Object.fromEntries(layoutLineup(players,formation).map(({slot,player})=>[player.id,{x:slot.x,y:slot.y} satisfies TacticalPoint]));}
export function lineupPlacements(players:LeaguePlayer[],formation:Formation,manual?:Record<string,TacticalPoint>):TacticalPlayerPlacement[]{const defaults=layoutLineup(players,formation),fallback=new Map(defaults.map(item=>[item.player.id,item.slot]));return players.map(player=>{const slot=fallback.get(player.id),point=manual?.[player.id]??(slot?{x:slot.x,y:slot.y}:{x:50,y:50});return{player,point,label:slot?.label??player.position,manual:Boolean(manual?.[player.id])};});}
