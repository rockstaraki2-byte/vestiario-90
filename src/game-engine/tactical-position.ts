import type{LeaguePlayer}from"./league";

export type TacticalPoint={x:number;y:number};
const TARGETS:Record<string,TacticalPoint>={GOL:{x:50,y:91},LE:{x:18,y:70},LD:{x:82,y:70},ZAG:{x:50,y:74},VOL:{x:50,y:58},MC:{x:50,y:49},MEI:{x:50,y:36},PE:{x:20,y:27},PD:{x:80,y:27},ATA:{x:50,y:15}};
export function clampTacticalPoint(point:TacticalPoint):TacticalPoint{return{x:Math.max(7,Math.min(93,Math.round(point.x*10)/10)),y:Math.max(7,Math.min(93,Math.round(point.y*10)/10))};}
export function naturalTacticalPoint(position:string){return TARGETS[position]??TARGETS.MC;}
export function tacticalFitMultiplier(player:LeaguePlayer,point?:TacticalPoint){if(!point)return 1;const target=naturalTacticalPoint(player.position),dx=(point.x-target.x)*.85,dy=(point.y-target.y)*1.05,distance=Math.sqrt(dx*dx+dy*dy);return Math.max(.76,Math.min(1.04,1.04-distance/185));}
export function tacticalZone(point:TacticalPoint){if(point.y>=82)return"Goleiro";if(point.y>=61)return point.x<32?"Lateral esquerdo":point.x>68?"Lateral direito":"Defesa";if(point.y>=43)return point.y>=54?"Volância":"Meio-campo";if(point.y>=27)return point.x<35?"Ponta esquerda":point.x>65?"Ponta direita":"Meia ofensivo";return point.x<35?"Ataque esquerdo":point.x>65?"Ataque direito":"Centroavante";}
