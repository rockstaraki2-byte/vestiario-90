"use client";

import { useEffect, useRef } from "react";
import type { SeasonState } from "@/game-engine/season";
import { activeSaveId, saveToSlot } from "@/game-engine/save-slots";

export function useCareerAutosave(saveId:string|null,season:SeasonState){
  const lastSignature=useRef("");
  useEffect(()=>{
    if(!season.preferences?.general?.autoSave)return;
    const id=saveId??activeSaveId();if(!id)return;
    const signature=`${season.year}:${season.currentDate}:${season.currentRound}:${season.market?.sequence??0}:${season.lastUserMatch?.fixtureId??""}`;
    if(signature===lastSignature.current)return;
    const timer=window.setTimeout(()=>{const saved=saveToSlot(id,season);if(saved)lastSignature.current=signature;},350);
    return()=>window.clearTimeout(timer);
  },[saveId,season]);
}
