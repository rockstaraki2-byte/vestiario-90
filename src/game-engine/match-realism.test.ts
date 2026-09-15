import{describe,expect,it}from"vitest";
import{SeededRng}from"./rng";
import{auditResults,calibratedExpectedGoals,samplePoisson}from"./match-realism";
import{postMatchPhysicalUpdate,rollMatchInjury}from"./player-health";

describe("Sprint 13 — motor de realismo",()=>{
  it("mantém uma amostra grande de placares dentro das bandas de futebol profissional",()=>{const rng=new SeededRng("s13:results"),results=[] as Array<{homeGoals:number;awayGoals:number}>;for(let i=0;i<20_000;i++){const gap=(rng.next()-.5)*24,expected=calibratedExpectedGoals(75+gap/2,75-gap/2);results.push({homeGoals:samplePoisson(rng,expected.home),awayGoals:samplePoisson(rng,expected.away)});}const audit=auditResults(results);expect(audit.withinTargets).toBe(true);expect(audit.goalsPerMatch).toBeGreaterThan(2.35);expect(audit.goalsPerMatch).toBeLessThan(3.05);});
  it("faz diferença de força aumentar a expectativa do favorito sem zerar a zebra",()=>{const balanced=calibratedExpectedGoals(75,75),favorite=calibratedExpectedGoals(88,68);expect(favorite.home).toBeGreaterThan(balanced.home);expect(favorite.away).toBeLessThan(balanced.away);expect(favorite.away).toBeGreaterThan(.3);});
  it("pouco descanso e fadiga elevam carga e risco físico",()=>{const rng=new SeededRng("s13:load"),fresh=postMatchPhysicalUpdate({age:25,condition:96,fatigue:10},{minutes:90,pressing:60,tempo:60,restDays:6},rng),loaded=postMatchPhysicalUpdate({age:33,condition:79,fatigue:64},{minutes:90,pressing:78,tempo:76,restDays:2},rng);expect(loaded.fatigue).toBeGreaterThan(fresh.fatigue);expect(loaded.condition).toBeLessThan(fresh.condition);expect(loaded.injuryProbability).toBeGreaterThan(fresh.injuryProbability);});
  it("mantém lesões leves mais frequentes que lesões graves",()=>{const rng=new SeededRng("s13:injuries");let short=0,severe=0,total=0;for(let i=0;i<10_000;i++){const result=rollMatchInjury(rng,.1);if(!result.injured)continue;total++;if(result.days<=8)short++;if(result.days>=25)severe++;}expect(total).toBeGreaterThan(800);expect(short).toBeGreaterThan(severe*5);});
});
