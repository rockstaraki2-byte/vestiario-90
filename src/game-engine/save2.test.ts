import{describe,expect,it}from"vitest";
import{checksumText}from"./offline-save";
import{SAVE_INDEX_KEY,SAVE_PREFIX,saveToSlot}from"./save-slots";
import{createSeason}from"./season";

function memoryStorage(){const data=new Map<string,string>();return{data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}}}

describe("Save 2.0",()=>{
 it("gera checksum determinístico e detecta alteração do payload",()=>{expect(checksumText("carreira-v90")).toBe(checksumText("carreira-v90"));expect(checksumText("carreira-v90")).not.toBe(checksumText("carreira-v91"))});
 it("só confirma o fallback local depois de conseguir ler exatamente o estado gravado",()=>{const storage=memoryStorage(),state=createSeason("save2-verified",2026),meta={id:"save-verified",name:"Carreira",createdAt:"2026-09-08T12:00:00.000Z",updatedAt:"2026-09-08T12:00:00.000Z",competitionId:"BRA1",competitionName:"Campeonato Brasileiro Série A",clubName:"Palmeiras",year:2026,currentDate:state.currentDate,currentRound:state.currentRound};storage.setItem(SAVE_INDEX_KEY,JSON.stringify([meta]));const saved=saveToSlot(meta.id,state,storage);expect(saved?.id).toBe(meta.id);expect(storage.getItem(`${SAVE_PREFIX}${meta.id}`)).toBe(JSON.stringify(state));});
});
