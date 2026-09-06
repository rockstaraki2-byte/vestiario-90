import{describe,expect,it}from"vitest";
import{createClubAiState,processClubAiRound,tacticForClub}from"./club-ai";
import{createLeague}from"./league";

describe("club manager AI",()=>{
 it("cria um técnico e identidade tática para cada clube",()=>{const league=createLeague("club-ai",2026,"BRA1"),state=createClubAiState(league,"club-ai");expect(state.managers).toHaveLength(league.clubs.length);const tactic=tacticForClub(state,league.clubs[0].id);expect(["4-2-3-1","4-3-3","4-4-2"]).toContain(tactic.formation);expect(tactic.pressing).toBeGreaterThanOrEqual(30)});
 it("demite técnico em situação crítica e registra a troca",()=>{const league=createLeague("club-ai-sack",2026,"BRA1"),state=createClubAiState(league,"club-ai-sack");state.managers[0].jobSecurity=0;state.managers[0].patience=40;const old=state.managers[0].managerName,next=processClubAiRound(state,league,6,"club-ai-sack");expect(next.managers[0].managerName).not.toBe(old);expect(next.history[0]?.oldManager).toBe(old)});
});
