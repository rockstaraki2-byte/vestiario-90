"use client";

import type { GamePreferences } from "@/game-engine/game-preferences";
import type { SeasonState } from "@/game-engine/season";
import FmDepthView, { V6_DEPTH_SCREENS } from "./fm-depth-view";
import { FmSpecialView as V5SpecialView } from "./fm-surfaces";

const depth=new Set<string>(V6_DEPTH_SCREENS);

export function FmSpecialView({active,season,onNavigate,onPreferencesChange}:{active:string;season:SeasonState;onNavigate:(screen:string)=>void;onPreferencesChange:(preferences:GamePreferences)=>void}){
 if(depth.has(active))return <FmDepthView active={active} season={season} onNavigate={onNavigate}/>;
 return <V5SpecialView active={active} season={season} onNavigate={onNavigate} onPreferencesChange={onPreferencesChange}/>;
}
