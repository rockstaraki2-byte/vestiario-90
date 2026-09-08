from pathlib import Path
import runpy

# Apply base rollout first.
runpy.run_path('scripts/apply-sprint-d-autosave.py', run_name='__main__')

# Replace autosave hook with a side-effect-only implementation.
Path('src/app/use-career-autosave.ts').write_text(r'''"use client";

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
''',encoding='utf-8')

# React-compiler-friendly negotiation panel: no manual memoization or state sync effect.
p=Path('src/app/market-negotiation-panel.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace('import{useEffect,useMemo,useState}from"react";','import{useState}from"react";')
old=' const club=season.league.clubs.find(c=>c.id===season.selectedClubId)!,targets=useMemo(()=>season.league.clubs.flatMap(c=>c.id===club.id?[]:c.players.map(player=>({club:c,player}))).sort((a,b)=>recommendedOffer(b.player)-recommendedOffer(a.player)).slice(0,45),[season.league.clubs,club.id]),[playerId,setPlayerId]=useState(targets[0]?.player.id??""),[type,setType]=useState<TransferOfferType>("Compra"),[draft,setDraft]=useState<NegotiationDraft|undefined>(()=>defaultNegotiationDraft(season,targets[0]?.player.id??"","Compra"));\n useEffect(()=>{setDraft(defaultNegotiationDraft(season,playerId,type));},[season,playerId,type]);'
new=' const club=season.league.clubs.find(c=>c.id===season.selectedClubId)!,targets=season.league.clubs.flatMap(c=>c.id===club.id?[]:c.players.map(player=>({club:c,player}))).sort((a,b)=>recommendedOffer(b.player)-recommendedOffer(a.player)).slice(0,45),[playerId,setPlayerId]=useState(targets[0]?.player.id??""),[type,setType]=useState<TransferOfferType>("Compra"),[draft,setDraft]=useState<NegotiationDraft|undefined>(()=>defaultNegotiationDraft(season,targets[0]?.player.id??"","Compra"));'
s=s.replace(old,new)
s=s.replace('onChange={e=>setPlayerId(e.target.value)}','onChange={e=>{const id=e.target.value;setPlayerId(id);setDraft(defaultNegotiationDraft(season,id,type))}}')
s=s.replace('onChange={e=>setType(e.target.value as TransferOfferType)}','onChange={e=>{const next=e.target.value as TransferOfferType;setType(next);setDraft(defaultNegotiationDraft(season,playerId,next))}}')
p.write_text(s,encoding='utf-8')

# Avoid synchronous state updates in mount effect; persist() already recovers ACTIVE_SAVE_KEY.
p=Path('src/app/page.tsx');s=p.read_text(encoding='utf-8')
s=s.replace('  useEffect(()=>{migrateLegacySeason();const active=activeSaveId();if(active&&!saveId)setSaveId(active)},[saveId]);\n  useCareerAutosave(saveId,season,id=>setSaveId(id),message=>flash(message));','  useEffect(()=>{migrateLegacySeason()},[]);\n  useCareerAutosave(saveId,season);')
p.write_text(s,encoding='utf-8')
print('Sprint D v2 fixes applied')
