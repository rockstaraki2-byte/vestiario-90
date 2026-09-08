"use client";
import { useState } from "react";
import type { LeagueClub } from "@/game-engine/league";
import type { LiveMatchState } from "@/game-engine/live-match";
import PhaserMatchRenderer from "./match-2d-phaser";
import LegacyMatch2DPitch from "./match-2d-legacy";
export default function Match2DPitch(props:{session:LiveMatchState;home:LeagueClub;away:LeagueClub}){
 const [fallback,setFallback]=useState(false);
 const fail=()=>setFallback(true);
 return fallback?<LegacyMatch2DPitch {...props}/>:<PhaserMatchRenderer {...props} onFailure={fail}/>;
}
