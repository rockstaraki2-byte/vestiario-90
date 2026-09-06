import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{createLiveMatch,liveMatchResult,makeSubstitution,playFirstHalf,playSecondHalf,requiredUserSubstitutions,setTeamTalk}from"./live-match";
import{DEFAULT_TACTIC}from"./match";

describe("live match",()=>{
 const league=createLeague("sprint-3");
 const home=league.clubs[0],away=league.clubs[1];
 const lineup=home.players.slice().sort((a,b)=>b.overall-a.overall).slice(0,11).map(p=>p.id);
 it("passa por primeiro tempo, intervalo e fim",()=>{
  let state=createLiveMatch(home,away,"ao-vivo","home",lineup,DEFAULT_TACTIC);
  expect(state.phase).toBe("pre_match");
  state=playFirstHalf(state,home,away);
  expect(state.phase).toBe("halftime");
  for(const injured of requiredUserSubstitutions(state)){
   const incoming=state.homeBenchIds[0];
   if(incoming)state=makeSubstitution(state,"home",injured,incoming);
  }
  state=setTeamTalk(state,"Incentivar");
  state=playSecondHalf(state,home,away);
  expect(state.phase).toBe("fulltime");
  expect(liveMatchResult(state)?.events.at(-1)?.type).toBe("fulltime");
 });
 it("limita o treinador a cinco substituições",()=>{
  let state=playFirstHalf(createLiveMatch(home,away,"cinco-trocas","home",lineup,DEFAULT_TACTIC),home,away);
  for(let i=0;i<5;i++)state=makeSubstitution(state,"home",state.homeLineupIds[i],state.homeBenchIds[0]);
  expect(state.substitutions.filter(s=>s.side==="home")).toHaveLength(5);
  const before=state.homeLineupIds.join("|");
  state=makeSubstitution(state,"home",state.homeLineupIds[5],state.homeBenchIds[0]);
  expect(state.homeLineupIds.join("|")).toBe(before);
 });
});
