import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer } from "./league";

export type Formation = "4-2-3-1" | "4-3-3" | "4-4-2";
export type Mentality = "Defensiva" | "Equilibrada" | "Ofensiva";
export type MatchTactic = { formation:Formation; mentality:Mentality; pressing:number; tempo:number };
export type MatchEventType = "kickoff" | "chance" | "goal" | "card" | "halftime" | "fulltime";
export type MatchEvent = { minute:number; type:MatchEventType; team:"home"|"away"|"neutral"; text:string };
export type MatchResult = { homeGoals:number; awayGoals:number; possessionHome:number; shotsHome:number; shotsAway:number; events:MatchEvent[] };

export const DEFAULT_TACTIC:MatchTactic={formation:"4-2-3-1",mentality:"Equilibrada",pressing:62,tempo:58};

function starters(club:LeagueClub):LeaguePlayer[]{return club.players.slice().sort((a,b)=>b.overall-a.overall).slice(0,11)}
function strength(club:LeagueClub,tactic:MatchTactic){
 const base=starters(club).reduce((sum,p)=>sum+p.overall*(p.condition/100),0)/11;
 const mentality=tactic.mentality==="Ofensiva"?2:tactic.mentality==="Defensiva"?-1:0;
 return base+mentality+(tactic.pressing-50)*.025+(tactic.tempo-50)*.02;
}

export function simulateMatch(home:LeagueClub,away:LeagueClub,seed:string,tactic:MatchTactic=DEFAULT_TACTIC):MatchResult{
 const rng=new SeededRng(seed),homeStrength=strength(home,tactic)+2.2,awayStrength=strength(away,DEFAULT_TACTIC);
 const share=Math.max(38,Math.min(62,Math.round(50+(homeStrength-awayStrength)*.8+(rng.integer(-4,4)))));
 const shotsHome=Math.max(5,Math.round(9+(homeStrength-awayStrength)*.32+(tactic.tempo-50)*.06+rng.integer(-2,4)));
 const shotsAway=Math.max(4,Math.round(9+(awayStrength-homeStrength)*.28+rng.integer(-2,3)));
 const events:MatchEvent[]=[{minute:0,type:"kickoff",team:"neutral",text:`Bola rolando no Estádio do Farol. ${home.name} começa com a posse.`}];
 let homeGoals=0,awayGoals=0;
 const chances:Array<{minute:number;team:"home"|"away";goal:boolean}>=[];
 for(let i=0;i<shotsHome;i++)chances.push({minute:rng.integer(3,89),team:"home",goal:rng.next()<Math.max(.07,Math.min(.28,.13+(homeStrength-awayStrength)*.006))});
 for(let i=0;i<shotsAway;i++)chances.push({minute:rng.integer(3,89),team:"away",goal:rng.next()<Math.max(.06,Math.min(.25,.12+(awayStrength-homeStrength)*.006))});
 chances.sort((a,b)=>a.minute-b.minute).forEach((chance,index)=>{
  const club=chance.team==="home"?home:away,opponent=chance.team==="home"?away:home;
  const attacker=rng.pick(starters(club).filter(p=>["ATA","PE","PD","MEI","MC"].includes(p.position)));
  if(chance.goal){if(chance.team==="home")homeGoals++;else awayGoals++;events.push({minute:chance.minute,type:"goal",team:chance.team,text:`GOL DO ${club.shortName}! ${attacker.name} finaliza com categoria após pressão sobre o ${opponent.shortName}.`})}
  else if(index%3===0)events.push({minute:chance.minute,type:"chance",team:chance.team,text:`${attacker.name} encontra espaço e finaliza, mas a chance passa por pouco.`});
 });
 events.push({minute:45,type:"halftime",team:"neutral",text:"Intervalo. As comissões ajustam posicionamento e intensidade."});
 if(rng.next()<.72){const cardClub=rng.next()<.5?home:away;events.push({minute:rng.integer(51,82),type:"card",team:cardClub===home?"home":"away",text:`Cartão amarelo para ${rng.pick(starters(cardClub)).name} após parar o contra-ataque.`})}
 events.push({minute:90,type:"fulltime",team:"neutral",text:`Fim de jogo: ${home.name} ${homeGoals} × ${awayGoals} ${away.name}.`});
 events.sort((a,b)=>a.minute-b.minute||(["kickoff","chance","goal","card","halftime","fulltime"].indexOf(a.type)-["kickoff","chance","goal","card","halftime","fulltime"].indexOf(b.type)));
 return{homeGoals,awayGoals,possessionHome:share,shotsHome,shotsAway,events};
}
