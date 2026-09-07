import { describe,expect,it } from "vitest";
import { createLeague } from "./league";
import { createFootballDepth, hiddenPlayerTraits, promoteYouthProspect, requestScouting } from "./football-depth";

describe("football depth",()=>{
 it("keeps hidden traits deterministic",()=>{const league=createLeague("traits",2026,"BRA1"),player=league.clubs[0].players[0];expect(hiddenPlayerTraits(player,"seed")).toEqual(hiddenPlayerTraits(player,"seed"));});
 it("improves scouting knowledge",()=>{const league=createLeague("scouting",2026,"BRA1"),depth=createFootballDepth(league,league.clubs[0].id,"seed",2026),target=league.clubs[1].players[0],next=requestScouting(depth,league,league.clubs[0].id,target.id,"2026-02-01","seed");expect(next.scoutingReports[0].knowledge).toBeGreaterThan(10);});
 it("promotes a youth player into the senior squad",()=>{const league=createLeague("academy",2026,"BRA1"),club=league.clubs[0],depth=createFootballDepth(league,club.id,"seed",2026),prospect=depth.youth[0],before=club.players.length,result=promoteYouthProspect(depth,club,prospect.id,2026,"seed");expect(result.player).toBeTruthy();expect(club.players.length).toBe(before+1);expect(result.depth.youth.find(y=>y.id===prospect.id)?.status).toBe("Promovido");});
});
