import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{createLiveMatch,liveMatchResult,makeSubstitution,playFinalMinutes,playFirstHalf,playSecondHalf,requiredUserSubstitutions,setTeamTalk}from"./live-match";
import{DEFAULT_TACTIC}from"./match";

describe("live match",()=>{
 const league=createLeague("sprint-3");
 const home=league.clubs[0],away=league.clubs[1];
 const lineup=home.players.slice().sort((a,b)=>b.overall-a.overall).slice(0,11).map(p=>p.id);
 function resolveUserInjuries(state:ReturnType<typeof createLiveMatch>){
  let next=state;
  for(const injured of requiredUserSubstitutions(next)){
   const incoming=next.homeBenchIds[0];
   if(incoming)next=makeSubstitution(next,"home",injured,incoming);
  }
  return next;
 }
 it("passa por primeiro tempo, intervalo, janela aos 70 e fim",()=>{
  let state=createLiveMatch(home,away,"ao-vivo","home",lineup,DEFAULT_TACTIC);
  expect(state.phase).toBe("pre_match");
  state=playFirstHalf(state,home,away);
  expect(state.phase).toBe("halftime");
  state=resolveUserInjuries(state);
  state=setTeamTalk(state,"Incentivar");
  state=playSecondHalf(state,home,away);
  expect(state.phase).toBe("second_half_window");
  state=resolveUserInjuries(state);
  state=playFinalMinutes(state,home,away);
  expect(state.phase).toBe("fulltime");
  expect(liveMatchResult(state)?.events.at(-1)?.type).toBe("fulltime");
 });
 it("permite distribuir até cinco trocas entre as duas janelas",()=>{
  let state=playFirstHalf(createLiveMatch(home,away,"cinco-trocas","home",lineup,DEFAULT_TACTIC),home,away);
  for(let i=0;i<3;i++)state=makeSubstitution(state,"home",state.homeLineupIds[i],state.homeBenchIds[0]);
  state=playSecondHalf(state,home,away);
  for(let i=0;i<2;i++)state=makeSubstitution(state,"home",state.homeLineupIds[i],state.homeBenchIds[0]);
  expect(state.substitutions.filter(s=>s.side==="home")).toHaveLength(5);
  expect(state.substitutions.some(s=>s.minute===46)).toBe(true);
  expect(state.substitutions.some(s=>s.minute===70)).toBe(true);
  const before=state.homeLineupIds.join("|");
  state=makeSubstitution(state,"home",state.homeLineupIds[5],state.homeBenchIds[0]);
  expect(state.homeLineupIds.join("|")).toBe(before);
 });
});
