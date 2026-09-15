import{describe,expect,it}from"vitest";
import{SeededRng}from"./rng";
import{postMatchPhysicalUpdate,recoverPhysicalState,returnToPlayAssessment}from"./player-health";
import{congestionMetrics}from"./workload";

describe("Sprint 14 — médico, performance e calendário",()=>{
 it("identifica retorno com restrições quando o atleta ainda não está pronto",()=>{const report=returnToPlayAssessment({age:29,condition:76,fatigue:61,injuryDays:0});expect(report.status).toBe("Liberado com restrições");expect(report.recommendedMinutes).toBeLessThan(90);expect(report.riskMultiplier).toBeGreaterThan(1);});
 it("departamento médico melhor reduz risco na mesma carga",()=>{const low=postMatchPhysicalUpdate({age:31,condition:83,fatigue:52},{minutes:90,pressing:72,tempo:70,restDays:3,medicalLevel:1},new SeededRng("s14-low")),high=postMatchPhysicalUpdate({age:31,condition:83,fatigue:52},{minutes:90,pressing:72,tempo:70,restDays:3,medicalLevel:5},new SeededRng("s14-low"));expect(high.injuryProbability).toBeLessThan(low.injuryProbability);expect(high.loadScore).toBeLessThan(low.loadScore);});
 it("estrutura médica melhor acelera recuperação",()=>{const weak=recoverPhysicalState({age:28,condition:68,fatigue:70,injuryDays:12},4,{medicalLevel:1}),strong=recoverPhysicalState({age:28,condition:68,fatigue:70,injuryDays:12},4,{medicalLevel:5,recoveryTraining:true});expect(strong.condition).toBeGreaterThan(weak.condition);expect(strong.fatigue).toBeLessThan(weak.fatigue);expect(strong.injuryDays).toBeLessThanOrEqual(weak.injuryDays);});
 it("detecta sequência congestionada sem precisar remanejar automaticamente",()=>{const c=congestionMetrics(["2026-09-06","2026-09-09","2026-09-13","2026-09-16","2026-09-20"],"2026-09-13");expect(c.restDays).toBe(4);expect(c.denseEightDayWindow).toBeGreaterThanOrEqual(3);expect(c.matchesNext7).toBe(2);});
});
