import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{advanceLiveMatchMinute,createLiveMatch,liveMatchResult,makeSubstitution,requiredUserSubstitutions,resumeSecondHalf,setTeamTalk,startLiveMatch}from"./live-match";
import{DEFAULT_TACTIC}from"./match";

describe("live match minuto a minuto",()=>{
 const league=createLeague("sprint-9");
 const home=league.clubs[0],away=league.clubs[1];
 const lineup=home.players.slice().sort((a,b)=>b.overall-a.overall).slice(0,11).map(p=>p.id);
 function resolveUserInjuries(state:ReturnType<typeof createLiveMatch>){let next=state;for(const injured of requiredUserSubstitutions(next)){const incoming=next.homeBenchIds[0];if(incoming)next=makeSubstitution(next,"home",injured,incoming)}return next}
 function tick(state:ReturnType<typeof createLiveMatch>,until:number){let next=state;while(next.currentMinute<until&&next.phase!=="fulltime"){next=resolveUserInjuries(next);if(next.phase==="halftime")next=resumeSecondHalf(next);else next=advanceLiveMatchMinute(next,home,away)}return next}
 it("avança exatamente um minuto por atualização",()=>{let state=startLiveMatch(createLiveMatch(home,away,"clock","home",lineup,DEFAULT_TACTIC),home);state=advanceLiveMatchMinute(state,home,away);expect(state.currentMinute).toBe(1);state=advanceLiveMatchMinute(state,home,away);expect(state.currentMinute).toBe(2)});
 it("para no intervalo e volta após a conversa",()=>{let state=startLiveMatch(createLiveMatch(home,away,"intervalo","home",lineup,DEFAULT_TACTIC),home);state=tick(state,45);expect(state.currentMinute).toBe(45);expect(state.phase).toBe("halftime");state=resolveUserInjuries(state);state=setTeamTalk(state,"Incentivar");state=resumeSecondHalf(state);expect(state.phase).toBe("second_half_window");state=advanceLiveMatchMinute(state,home,away);expect(state.currentMinute).toBe(46)});
 it("permite substituição durante o jogo fora das janelas antigas",()=>{let state=startLiveMatch(createLiveMatch(home,away,"troca-23","home",lineup,DEFAULT_TACTIC),home);state=tick(state,23);state=resolveUserInjuries(state);const out=state.homeLineupIds[2],incoming=state.homeBenchIds[0];state=makeSubstitution(state,"home",out,incoming);expect(state.substitutions.at(-1)?.minute).toBe(23);expect(state.homeLineupIds).toContain(incoming);expect(state.homeLineupIds).not.toContain(out)});
 it("encerra em 90 minutos e produz resultado",()=>{let state=startLiveMatch(createLiveMatch(home,away,"fulltime","home",lineup,DEFAULT_TACTIC),home);state=tick(state,90);expect(state.phase).toBe("fulltime");expect(state.currentMinute).toBe(90);expect(liveMatchResult(state)?.events.at(-1)?.type).toBe("fulltime")});
 it("mantém limite de cinco substituições",()=>{let state=startLiveMatch(createLiveMatch(home,away,"five","home",lineup,DEFAULT_TACTIC),home);state=tick(state,12);state=resolveUserInjuries(state);for(let i=0;i<5;i++){state=makeSubstitution(state,"home",state.homeLineupIds[i],state.homeBenchIds[0])}expect(state.substitutions.filter(s=>s.side==="home")).toHaveLength(5);const before=state.homeLineupIds.join("|");state=makeSubstitution(state,"home",state.homeLineupIds[6],state.homeBenchIds[0]);expect(state.homeLineupIds.join("|")).toBe(before)});
});
