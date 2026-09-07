import { describe, expect, it } from "vitest";
import { createSeason } from "./season";
import { SAVE_INDEX_KEY, saveToSlot } from "./save-slots";

function quotaFailingStorage(){
  const data=new Map<string,string>([[SAVE_INDEX_KEY,JSON.stringify([{id:"save-test",name:"Teste",createdAt:"2026-09-07T00:00:00.000Z",updatedAt:"2026-09-07T00:00:00.000Z",competitionId:"BRA1",competitionName:"Brasileirão",clubName:"Clube",year:2026,currentDate:"2026-01-01",currentRound:1}])]]);
  return {
    getItem:(key:string)=>data.get(key)??null,
    setItem:()=>{throw new DOMException("Quota exceeded","QuotaExceededError");},
    removeItem:(key:string)=>{data.delete(key);},
  };
}

describe("save slots resilience",()=>{
  it("não deixa falha de armazenamento interromper o fluxo do jogo",()=>{
    const state=createSeason("storage-resilience",2026);
    expect(()=>saveToSlot("save-test",state,quotaFailingStorage())).not.toThrow();
    expect(saveToSlot("save-test",state,quotaFailingStorage())).toBeUndefined();
  });
});
