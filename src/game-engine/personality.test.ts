import { describe, expect, it } from "vitest";
import { personalityProfile, conversationResponseModifier } from "./personality";
import type { LeaguePlayer } from "./league";

function player(personality:LeaguePlayer["personality"]):LeaguePlayer{
  return {
    id:"player-1",transfermarktId:"tm-1",name:"Teste",position:"MC",age:27,marketValueEur:5_000_000,overall:72,potential:75,seasonStartOverall:72,developmentProgress:0,overallHistory:[],morale:75,condition:95,fatigue:4,form:7,goals:0,assists:0,shots:0,yellowCards:0,redCards:0,wins:0,draws:0,losses:0,cleanSheets:0,ratingTotal:0,ratedMatches:0,averageRating:0,lastRating:0,injuryDays:0,suspensionMatches:0,status:"Titular",personality,squadRole:"Titular",happiness:75,managerTrust:70,appearances:0,starts:0,minutes:0,promises:[],contract:{salaryBrlMonthly:100_000,startYear:2026,endYear:2029,agentName:"Agente",releaseClauseEur:null},transferListed:false,wantsToLeave:false,joinedClubYear:2024,clubTrainedYears:2,associationTrained:true,
  };
}

describe("player personality profile",()=>{
  it("is deterministic for the same player",()=>{
    const a=personalityProfile(player("Profissional"));
    const b=personalityProfile(player("Profissional"));
    expect(a).toEqual(b);
  });

  it("keeps the archetype direction while adding variation",()=>{
    expect(personalityProfile(player("Ambicioso")).ambition).toBeGreaterThan(70);
    expect(personalityProfile(player("Leal")).loyalty).toBeGreaterThan(75);
    expect(personalityProfile(player("Temperamental")).temperament).toBeGreaterThan(75);
  });

  it("changes conversation reactions by personality",()=>{
    const professional=conversationResponseModifier(player("Profissional"),"Cobrar");
    const temperamental=conversationResponseModifier(player("Temperamental"),"Cobrar");
    expect(professional).toBeGreaterThan(temperamental);
  });
});
