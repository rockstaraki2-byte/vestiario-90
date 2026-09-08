import{describe,expect,it}from"vitest";
import{compareSaveFreshness}from"./offline-save";
import{createSeason}from"./season";
import{createSaveSlot,loadSaveSlot,saveToSlot,type SaveSlotMeta}from"./save-slots";

function meta(updatedAt:string,currentDate:string,currentRound:number):SaveSlotMeta{return{id:"save-pwa",name:"PWA",createdAt:"2026-09-08T12:00:00.000Z",updatedAt,competitionId:"BRA1",competitionName:"Brasileirão",clubName:"Clube",year:2026,currentDate,currentRound};}
function memoryStorage(){const data=new Map<string,string>();return{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}};}

describe("PWA save freshness",()=>{
 it("prefere a cópia local mais nova a um snapshot durável antigo",()=>{const oldState=createSeason("old",2026),newState={...oldState,currentDate:"2026-04-12",currentRound:10};oldState.currentDate="2026-04-05";oldState.currentRound=9;expect(compareSaveFreshness(meta("2026-09-08T18:00:00.000Z",newState.currentDate,newState.currentRound),newState,meta("2026-09-08T17:59:00.000Z",oldState.currentDate,oldState.currentRound),oldState)).toBeGreaterThan(0);});
 it("usa data e rodada como desempate quando o timestamp coincide",()=>{const a=createSeason("same",2026),b={...a,currentDate:"2026-05-03",currentRound:14};a.currentDate="2026-04-29";a.currentRound=13;const stamp="2026-09-08T18:00:00.000Z";expect(compareSaveFreshness(meta(stamp,b.currentDate,b.currentRound),b,meta(stamp,a.currentDate,a.currentRound),a)).toBeGreaterThan(0);});
 it("grava imediatamente no fallback local antes de qualquer persistência assíncrona",()=>{const storage=memoryStorage(),initial=createSeason("local-immediate",2026),slot=createSaveSlot(initial,"Teste PWA",storage)!;const next={...initial,currentDate:"2026-06-21",currentRound:18};expect(saveToSlot(slot.id,next,storage)).toBeDefined();expect(loadSaveSlot(slot.id,storage)?.state.currentDate).toBe("2026-06-21");expect(loadSaveSlot(slot.id,storage)?.state.currentRound).toBe(18);});
});
