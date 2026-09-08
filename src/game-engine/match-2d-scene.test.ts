import { describe,expect,it } from "vitest";
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
