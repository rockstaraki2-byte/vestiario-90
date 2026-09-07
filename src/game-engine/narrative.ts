import type { LeagueWorld } from "./league";
import type { LivingWorldState } from "./world-events";

export type NarrativeContext={day:number;round:number;selectedClubId:string;seed:string;league:LeagueWorld};

/**
 * Legacy calendar hook kept for save compatibility. Daily off-field random
 * interruptions were removed: the manager now reacts to football events,
 * board/player matters and official pre/post-match press conferences only.
 */
export function applyNarrativeDay(world:LivingWorldState,context:NarrativeContext):LivingWorldState{
  const dayKey=context.round*100+context.day;
  if(world.lastNarrativeDay===dayKey)return world;
  return{...world,lastNarrativeDay:dayKey};
}
