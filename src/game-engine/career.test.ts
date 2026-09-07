import{describe,expect,it}from"vitest";
import{applyCareerChoice,careerAfterRound,createManagerCareer}from"./career";
import{createLeague}from"./league";
import{createLivingWorld}from"./world-events";

describe("manager career",()=>{
 const league=createLeague("career-tests",2026),club=league.clubs[0];
 it("começa empregado com histórico aberto",()=>{const career=createManagerCareer(club,2026);expect(career.status).toBe("Empregado");expect(career.currentClubId).toBe(club.id);expect(career.spells).toHaveLength(1)});
 it("demite o treinador quando segurança e diretoria entram em nível crítico",()=>{const career=createManagerCareer(club,2026);career.jobSecurity=17;let world=createLivingWorld(club.name);world={...world,boardConfidence:13};const result=careerAfterRound(career,league,world,8,2026,"dismiss",{goalsFor:0,goalsAgainst:3});expect(result.career.status).toBe("Sem clube");expect(result.career.dismissals).toBe(1);expect(result.world.inbox.some(event=>event.kind==="Carreira"&&event.title.includes("Fim da passagem"))).toBe(true)});
 it("gera proposta direta para treinador sem clube sem entrevista",()=>{const career=createManagerCareer(club,2026);career.status="Sem clube";career.currentClubId=undefined;career.lastDismissalRound=6;const result=careerAfterRound(career,league,createLivingWorld(club.name),7,2026,"unemployed");const offer=result.world.inbox.find(event=>event.kind==="Carreira"&&event.choices.some(choice=>choice.careerAction==="accept-job"));expect(offer).toBeTruthy();expect(result.world.inbox.some(event=>event.choices.some(choice=>choice.careerAction==="accept-interview"))).toBe(false)});
 it("permite assumir um clube a partir da proposta formal",()=>{const career=createManagerCareer(club,2026);career.status="Sem clube";career.currentClubId=undefined;career.lastDismissalRound=6;const round=careerAfterRound(career,league,createLivingWorld(club.name),7,2026,"hire-direct");const offer=round.world.inbox.find(event=>event.kind==="Carreira"&&event.choices.some(choice=>choice.careerAction==="accept-job"))!;const accept=offer.choices.find(choice=>choice.careerAction==="accept-job")!;const hired=applyCareerChoice(round.career,league,round.world,accept,7,2026,"hire-direct");expect(hired.career.status).toBe("Empregado");expect(hired.nextClubId).toBeTruthy();expect(hired.career.currentClubId).toBe(hired.nextClubId)});
});
