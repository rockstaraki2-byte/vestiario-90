"use client";
import{useCallback,useEffect,useRef,useState}from"react";
import type{SeasonState}from"@/game-engine/season";
import{activeSaveId,saveToSlot,saveToSlotAsync,type SaveWriteResult}from"@/game-engine/save-slots";

export type CareerSaveStatus={status:"idle"|"saving"|"saved"|"error";lastSavedAt?:string;error?:string;durable?:SaveWriteResult["durable"];backupCount:number};
function fingerprint(season:SeasonState){const raw=JSON.stringify(season);let h=2166136261;for(let i=0;i<raw.length;i+=Math.max(1,Math.floor(raw.length/2500))){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return`${raw.length}:${h>>>0}:${season.currentDate}:${season.currentRound}`}

export function useCareerAutosave(saveId:string|null,season:SeasonState){
 const latest=useRef(season),latestId=useRef(saveId),last=useRef(""),queue=useRef<Promise<void>>(Promise.resolve()),mounted=useRef(true);
 const[saveStatus,setSaveStatus]=useState<CareerSaveStatus>({status:"idle",backupCount:0});
 useEffect(()=>{latest.current=season;latestId.current=saveId},[season,saveId]);
 useEffect(()=>()=>{mounted.current=false},[]);
 const enqueue=useCallback((id:string,state:SeasonState,signature:string)=>{setSaveStatus(current=>({...current,status:"saving",error:undefined}));queue.current=queue.current.catch(()=>{}).then(async()=>{const result=await saveToSlotAsync(id,state);if(result.ok){last.current=signature;if(mounted.current)setSaveStatus({status:"saved",lastSavedAt:new Date().toISOString(),durable:result.durable,backupCount:result.backupCount});}else if(mounted.current)setSaveStatus(current=>({...current,status:"error",error:result.error??"Falha ao salvar",durable:result.durable,backupCount:result.backupCount}));});},[]);
 useEffect(()=>{if(!season.preferences?.general?.autoSave)return;const id=saveId??activeSaveId();if(!id)return;const signature=fingerprint(season);if(signature===last.current)return;const timer=window.setTimeout(()=>enqueue(id,season,signature),180);return()=>window.clearTimeout(timer)},[saveId,season,enqueue]);
 useEffect(()=>{const flush=()=>{const current=latest.current;if(!current.preferences?.general?.autoSave)return;const id=latestId.current??activeSaveId();if(!id)return;const signature=fingerprint(current);/* Emergency local mirror for page suspension, plus the durable queued IndexedDB write. */saveToSlot(id,current);enqueue(id,current,signature)};const visibility=()=>{if(document.visibilityState==="hidden")flush()};window.addEventListener("pagehide",flush);window.addEventListener("beforeunload",flush);window.addEventListener("offline",flush);window.addEventListener("freeze",flush);document.addEventListener("visibilitychange",visibility);return()=>{window.removeEventListener("pagehide",flush);window.removeEventListener("beforeunload",flush);window.removeEventListener("offline",flush);window.removeEventListener("freeze",flush);document.removeEventListener("visibilitychange",visibility)}},[enqueue]);
 return saveStatus;
}
