import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{agentProfile,managerIdentity,playerMemoryBalance}from"./immersion";

describe("immersion systems",()=>{
 it("derives a stable agent profile from the real player contract",()=>{const season=createSeason("immersion-agent",2026),player=season.league.clubs[0].players[0],a=agentProfile(player),b=agentProfile(player);expect(a).toEqual(b);expect(a.name).toBe(player.contract.agentName);expect(a.influence).toBeGreaterThan(0)});
 it("turns persistent save history into player memory",()=>{const season=createSeason("immersion-memory",2026),player=season.league.clubs[0].players[0];player.promises=[{id:"p1",type:"Mais minutos",createdRound:2,deadlineRound:5,targetAppearances:3,progressAppearances:0,status:"Quebrada"}];const memory=playerMemoryBalance(player,season.livingWorld);expect(memory.memories.some(item=>item.title==="Promessa quebrada")).toBe(true);expect(memory.score).toBeLessThan(60)});
 it("builds manager RPG identity from career and world history",()=>{const season=createSeason("immersion-manager",2026);season.career.matches=20;season.career.wins=13;season.livingWorld.managerReputation=76;season.livingWorld.boardConfidence=80;const identity=managerIdentity(season.career,season.livingWorld);expect(identity.primary.length).toBeGreaterThan(3);expect(identity.attributes.leadership).toBeGreaterThan(50);expect(identity.attributes.pressure).toBeGreaterThan(50)});
});
