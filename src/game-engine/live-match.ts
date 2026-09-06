import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer } from "./league";
import { DEFAULT_TACTIC, pickStartingXI, type MatchEvent, type MatchResult, type MatchTactic } from "./match";

export type LiveMatchPhase="pre_match"|"halftime"|"second_half_window"|"fulltime";
export type TeamTalk="Cobrar"|"Incentivar"|"Acalmar";
export type MatchSide="home"|"away";
export type LiveSubstitution={side:MatchSide;outPlayerId:string;inPlayerId:string;minute:number};
export type LiveMatchState={
  seed:string;
  phase:LiveMatchPhase;
  userSide:MatchSide;
  homeLineupIds:string[];
  awayLineupIds:string[];
  homeBenchIds:string[];
  awayBenchIds:string[];
  homeTactic:MatchTactic;
  awayTactic:MatchTactic;
  homeGoals:number;
  awayGoals:number;
  possessionHome:number;
  shotsHome:number;
  shotsAway:number;
  events:MatchEvent[];
  substitutions:LiveSubstitution[];
  injuredPlayerIds:string[];
  usedPlayerIds:string[];
  teamTalk?:TeamTalk;
};
type PeriodOutcome={homeGoals:number;awayGoals:number;shotsHome:number;shotsAway:number;possessionHome:number;events:MatchEvent[];injuredPlayerIds:string[]};

function isDecisionPhase(state:LiveMatchState){return state.phase==="halftime"||state.phase==="second_half_window";}
function availableBench(club:LeagueClub,lineupIds:string[]):string[]{
  const selected=new Set(lineupIds);
  return club.players.filter(p=>p.injuryDays===0&&p.suspensionMatches===0&&!selected.has(p.id)).sort((a,b)=>b.overall-a.overall).slice(0,12).map(p=>p.id);
}
function exactLineup(club:LeagueClub,ids:string[]):LeaguePlayer[]{return ids.map(id=>club.players.find(p=>p.id===id)).filter((p):p is LeaguePlayer=>Boolean(p));}
function strength(club:LeagueClub,lineupIds:string[],tactic:MatchTactic,momentum=0){
  const lineup=exactLineup(club,lineupIds);if(!lineup.length)return 35;
  const base=lineup.reduce((sum,p)=>{const condition=p.condition/100,morale=.92+p.morale/1250,fatigue=Math.max(.76,1-p.fatigue/230);return sum+p.overall*condition*morale*fatigue;},0)/11;
  const mentality=tactic.mentality==="Ofensiva"?2.2:tactic.mentality==="Defensiva"?-.8:0;
  const manDown=Math.max(0,11-lineup.length)*3.2;
  return base+mentality+(tactic.pressing-50)*.026+(tactic.tempo-50)*.021+momentum-manDown;
}
function attackingPlayer(rng:SeededRng,lineup:LeaguePlayer[]){const candidates=lineup.filter(p=>["ATA","PE","PD","MEI","MC"].includes(p.position));return rng.pick(candidates.length?candidates:lineup);}

function simulatePeriod(state:LiveMatchState,home:LeagueClub,away:LeagueClub,startMinute:number,endMinute:number,suffix:string,userMomentum=0):PeriodOutcome{
  const rng=new SeededRng(`${state.seed}:${suffix}:${state.substitutions.length}`);
  const homeLineup=exactLineup(home,state.homeLineupIds),awayLineup=exactLineup(away,state.awayLineupIds);
  const homeMomentum=state.userSide==="home"?userMomentum:0,awayMomentum=state.userSide==="away"?userMomentum:0;
  const homeStrength=strength(home,state.homeLineupIds,state.homeTactic,homeMomentum)+2,awayStrength=strength(away,state.awayLineupIds,state.awayTactic,awayMomentum);
  const possessionHome=Math.max(35,Math.min(65,Math.round(50+(homeStrength-awayStrength)*.72+rng.integer(-4,4))));
  const periodFactor=(endMinute-startMinute+1)/90;
  const shotsHome=Math.max(1,Math.round((9+(homeStrength-awayStrength)*.3+(state.homeTactic.tempo-50)*.05)*periodFactor+rng.integer(0,2)));
  const shotsAway=Math.max(1,Math.round((9+(awayStrength-homeStrength)*.28+(state.awayTactic.tempo-50)*.04)*periodFactor+rng.integer(0,2)));
  const events:MatchEvent[]=[];let homeGoals=0,awayGoals=0;
  const chances:Array<{minute:number;side:MatchSide;goal:boolean}>=[];
  const minuteMin=Math.min(endMinute,Math.max(startMinute,startMinute+1)),minuteMax=Math.max(minuteMin,endMinute-1);
  for(let i=0;i<shotsHome;i++)chances.push({minute:rng.integer(minuteMin,minuteMax),side:"home",goal:rng.next()<Math.max(.07,Math.min(.28,.13+(homeStrength-awayStrength)*.006))});
  for(let i=0;i<shotsAway;i++)chances.push({minute:rng.integer(minuteMin,minuteMax),side:"away",goal:rng.next()<Math.max(.06,Math.min(.26,.12+(awayStrength-homeStrength)*.006))});
  chances.sort((a,b)=>a.minute-b.minute).forEach((chance,index)=>{
    const currentClub=chance.side==="home"?home:away,opponent=chance.side==="home"?away:home,lineup=chance.side==="home"?homeLineup:awayLineup;if(!lineup.length)return;
    const player=attackingPlayer(rng,lineup);
    if(chance.goal){if(chance.side==="home")homeGoals++;else awayGoals++;events.push({minute:chance.minute,type:"goal",team:chance.side,playerId:player.id,text:`GOL DO ${currentClub.shortName}! ${player.name} decide a jogada após pressão sobre o ${opponent.shortName}.`});}
    else if(index%2===0)events.push({minute:chance.minute,type:"chance",team:chance.side,playerId:player.id,text:`${player.name} encontra espaço e finaliza; a defesa consegue sobreviver.`});
  });
  for(const side of ["home","away"] as const){const lineup=side==="home"?homeLineup:awayLineup;if(lineup.length&&rng.next()<.34*periodFactor*2){const player=rng.pick(lineup);events.push({minute:rng.integer(minuteMin,minuteMax),type:"card",team:side,playerId:player.id,text:`Cartão amarelo para ${player.name} depois de interromper a transição.`});}}
  const injuredPlayerIds:string[]=[];
  for(const side of ["home","away"] as const){const lineup=side==="home"?homeLineup:awayLineup;if(lineup.length&&rng.next()<.065*periodFactor*2){const player=rng.pick(lineup);injuredPlayerIds.push(player.id);events.push({minute:rng.integer(minuteMin,minuteMax),type:"injury",team:side,playerId:player.id,text:`${player.name} sente um problema físico e pede atendimento. A comissão avalia a substituição.`});}}
  const order=["kickoff","chance","goal","card","injury","halftime","fulltime"];events.sort((a,b)=>a.minute-b.minute||(order.indexOf(a.type)-order.indexOf(b.type)));
  return{homeGoals,awayGoals,shotsHome,shotsAway,possessionHome,events,injuredPlayerIds};
}

export function createLiveMatch(home:LeagueClub,away:LeagueClub,seed:string,userSide:MatchSide,userLineupIds:string[],userTactic:MatchTactic=DEFAULT_TACTIC):LiveMatchState{
  const homeIds=userSide==="home"?pickStartingXI(home,userLineupIds).map(p=>p.id):pickStartingXI(home).map(p=>p.id);
  const awayIds=userSide==="away"?pickStartingXI(away,userLineupIds).map(p=>p.id):pickStartingXI(away).map(p=>p.id);
  return{seed,phase:"pre_match",userSide,homeLineupIds:homeIds,awayLineupIds:awayIds,homeBenchIds:availableBench(home,homeIds),awayBenchIds:availableBench(away,awayIds),homeTactic:userSide==="home"?userTactic:DEFAULT_TACTIC,awayTactic:userSide==="away"?userTactic:DEFAULT_TACTIC,homeGoals:0,awayGoals:0,possessionHome:50,shotsHome:0,shotsAway:0,events:[{minute:0,type:"kickoff",team:"neutral",text:`Tudo pronto para ${home.name} × ${away.name}.`}],substitutions:[],injuredPlayerIds:[],usedPlayerIds:[...new Set([...homeIds,...awayIds])]};
}

export function playFirstHalf(state:LiveMatchState,home:LeagueClub,away:LeagueClub):LiveMatchState{
  if(state.phase!=="pre_match")return state;
  const outcome=simulatePeriod(state,home,away,1,45,"H1");
  const homeGoals=state.homeGoals+outcome.homeGoals,awayGoals=state.awayGoals+outcome.awayGoals;
  return{...state,phase:"halftime",homeGoals,awayGoals,possessionHome:outcome.possessionHome,shotsHome:state.shotsHome+outcome.shotsHome,shotsAway:state.shotsAway+outcome.shotsAway,injuredPlayerIds:[...new Set([...state.injuredPlayerIds,...outcome.injuredPlayerIds])],events:[...state.events,...outcome.events,{minute:45,type:"halftime",team:"neutral",text:`Intervalo: ${home.name} ${homeGoals} × ${awayGoals} ${away.name}. Hora de decidir.`}]};
}
export function updateLiveTactic(state:LiveMatchState,side:MatchSide,tactic:MatchTactic):LiveMatchState{if(!isDecisionPhase(state))return state;return side==="home"?{...state,homeTactic:tactic}:{...state,awayTactic:tactic};}
export function setTeamTalk(state:LiveMatchState,talk:TeamTalk):LiveMatchState{return state.phase==="halftime"?{...state,teamTalk:talk}:state;}
export function makeSubstitution(state:LiveMatchState,side:MatchSide,outPlayerId:string,inPlayerId:string):LiveMatchState{
  if(!isDecisionPhase(state))return state;
  const sideSubs=state.substitutions.filter(s=>s.side===side);if(sideSubs.length>=5)return state;
  const lineup=side==="home"?state.homeLineupIds:state.awayLineupIds,bench=side==="home"?state.homeBenchIds:state.awayBenchIds;
  if(!lineup.includes(outPlayerId)||!bench.includes(inPlayerId))return state;
  const nextLineup=lineup.map(id=>id===outPlayerId?inPlayerId:id),nextBench=bench.filter(id=>id!==inPlayerId),minute=state.phase==="halftime"?46:70;
  const next={...state,substitutions:[...state.substitutions,{side,outPlayerId,inPlayerId,minute}],usedPlayerIds:[...new Set([...state.usedPlayerIds,inPlayerId])],injuredPlayerIds:state.injuredPlayerIds.filter(id=>id!==outPlayerId)};
  return side==="home"?{...next,homeLineupIds:nextLineup,homeBenchIds:nextBench}:{...next,awayLineupIds:nextLineup,awayBenchIds:nextBench};
}
function autoReplaceInjuries(state:LiveMatchState,side:MatchSide):LiveMatchState{
  if(side===state.userSide)return state;let next=state;
  const lineup=()=>side==="home"?next.homeLineupIds:next.awayLineupIds,bench=()=>side==="home"?next.homeBenchIds:next.awayBenchIds;
  for(const injured of [...next.injuredPlayerIds]){if(!lineup().includes(injured)||!bench().length)continue;next=makeSubstitution(next,side,injured,bench()[0]);}
  return next;
}
export function requiredUserSubstitutions(state:LiveMatchState):string[]{const lineup=state.userSide==="home"?state.homeLineupIds:state.awayLineupIds;return state.injuredPlayerIds.filter(id=>lineup.includes(id));}
function talkMomentum(state:LiveMatchState){const winning=state.userSide==="home"?state.homeGoals>state.awayGoals:state.awayGoals>state.homeGoals,losing=state.userSide==="home"?state.homeGoals<state.awayGoals:state.awayGoals<state.homeGoals;if(state.teamTalk==="Cobrar")return losing?1.7:winning?-.2:.9;if(state.teamTalk==="Incentivar")return 1;if(state.teamTalk==="Acalmar")return winning?.8:.25;return 0;}

export function playSecondHalf(state:LiveMatchState,home:LeagueClub,away:LeagueClub):LiveMatchState{
  if(state.phase!=="halftime"||requiredUserSubstitutions(state).length)return state;
  const prepared=autoReplaceInjuries(autoReplaceInjuries(state,"home"),"away"),outcome=simulatePeriod(prepared,home,away,46,70,"H2A",talkMomentum(prepared));
  const homeGoals=prepared.homeGoals+outcome.homeGoals,awayGoals=prepared.awayGoals+outcome.awayGoals,talkText=prepared.teamTalk?` Conversa no intervalo: ${prepared.teamTalk.toLowerCase()}.`:"";
  const events:MatchEvent[]=[...prepared.events,{minute:46,type:"kickoff",team:"neutral",text:`Começa o segundo tempo.${talkText}`},...outcome.events,{minute:70,type:"chance",team:"neutral",text:"70 minutos. Última janela para mexer no time antes da reta final."}];
  return{...prepared,phase:"second_half_window",homeGoals,awayGoals,possessionHome:Math.round((prepared.possessionHome+outcome.possessionHome)/2),shotsHome:prepared.shotsHome+outcome.shotsHome,shotsAway:prepared.shotsAway+outcome.shotsAway,injuredPlayerIds:[...new Set([...prepared.injuredPlayerIds,...outcome.injuredPlayerIds])],events};
}

export function playFinalMinutes(state:LiveMatchState,home:LeagueClub,away:LeagueClub):LiveMatchState{
  if(state.phase!=="second_half_window"||requiredUserSubstitutions(state).length)return state;
  const prepared=autoReplaceInjuries(autoReplaceInjuries(state,"home"),"away"),outcome=simulatePeriod(prepared,home,away,71,90,"H2B",talkMomentum(prepared)*.35);
  const homeGoals=prepared.homeGoals+outcome.homeGoals,awayGoals=prepared.awayGoals+outcome.awayGoals;
  const events:MatchEvent[]=[...prepared.events,...outcome.events,{minute:90,type:"fulltime",team:"neutral",text:`Fim de jogo: ${home.name} ${homeGoals} × ${awayGoals} ${away.name}.`}];
  return{...prepared,phase:"fulltime",homeGoals,awayGoals,possessionHome:Math.round((prepared.possessionHome+outcome.possessionHome)/2),shotsHome:prepared.shotsHome+outcome.shotsHome,shotsAway:prepared.shotsAway+outcome.shotsAway,injuredPlayerIds:[...new Set([...prepared.injuredPlayerIds,...outcome.injuredPlayerIds])],events};
}
export function liveMatchResult(state:LiveMatchState):MatchResult|null{return state.phase!=="fulltime"?null:{homeGoals:state.homeGoals,awayGoals:state.awayGoals,possessionHome:state.possessionHome,shotsHome:state.shotsHome,shotsAway:state.shotsAway,events:state.events};}
