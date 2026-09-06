import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer } from "./league";
import{tacticalFitMultiplier,type TacticalPoint}from"./tactical-position";

export type Formation = "4-2-3-1" | "4-3-3" | "4-4-2";
export type Mentality = "Defensiva" | "Equilibrada" | "Ofensiva";
export type MatchTactic = { formation:Formation; mentality:Mentality; pressing:number; tempo:number; positions?:Record<string,TacticalPoint> };
export type MatchEventType = "kickoff" | "chance" | "goal" | "card" | "injury" | "halftime" | "fulltime";
export type MatchEvent = { minute:number; type:MatchEventType; team:"home"|"away"|"neutral"; text:string; playerId?:string; assistPlayerId?:string };
export type MatchResult = { homeGoals:number; awayGoals:number; possessionHome:number; shotsHome:number; shotsAway:number; events:MatchEvent[] };

export const DEFAULT_TACTIC:MatchTactic={formation:"4-2-3-1",mentality:"Equilibrada",pressing:62,tempo:58};

export function pickStartingXI(club:LeagueClub,lineupIds?:string[]):LeaguePlayer[]{
  const available=club.players.filter(p=>p.injuryDays===0&&p.suspensionMatches===0);
  const requested=(lineupIds??[]).map(id=>available.find(p=>p.id===id)).filter((p):p is LeaguePlayer=>Boolean(p));
  const selected=[...requested];
  for(const player of [...available].sort((a,b)=>b.overall-a.overall)){
    if(selected.length>=11)break;
    if(!selected.some(p=>p.id===player.id))selected.push(player);
  }
  return selected.slice(0,11);
}

function strength(club:LeagueClub,tactic:MatchTactic,lineupIds?:string[]){
  const eleven=pickStartingXI(club,lineupIds);
  if(!eleven.length)return 40;
  const base=eleven.reduce((sum,p)=>{
    const condition=p.condition/100;
    const morale=.92+p.morale/1250;
    const fatigue=Math.max(.78,1-p.fatigue/240);
    const tacticalFit=tacticalFitMultiplier(p,tactic.positions?.[p.id]);
    return sum+p.overall*condition*morale*fatigue*tacticalFit;
  },0)/eleven.length;
  const mentality=tactic.mentality==="Ofensiva"?2:tactic.mentality==="Defensiva"?-1:0;
  return base+mentality+(tactic.pressing-50)*.025+(tactic.tempo-50)*.02;
}

function assister(rng:SeededRng,xi:LeaguePlayer[],scorer:LeaguePlayer){const pool=xi.filter(p=>p.id!==scorer.id&&["ATA","PE","PD","MEI","MC","VOL"].includes(p.position));return pool.length&&rng.next()<.72?rng.pick(pool):undefined;}

export function simulateMatch(
  home:LeagueClub,
  away:LeagueClub,
  seed:string,
  homeTactic:MatchTactic=DEFAULT_TACTIC,
  awayTactic:MatchTactic=DEFAULT_TACTIC,
  homeLineupIds?:string[],
  awayLineupIds?:string[],
):MatchResult{
  const rng=new SeededRng(seed);
  const homeXI=pickStartingXI(home,homeLineupIds),awayXI=pickStartingXI(away,awayLineupIds);
  const homeStrength=strength(home,homeTactic,homeLineupIds)+2.2,awayStrength=strength(away,awayTactic,awayLineupIds);
  const share=Math.max(38,Math.min(62,Math.round(50+(homeStrength-awayStrength)*.8+rng.integer(-4,4))));
  const shotsHome=Math.max(5,Math.round(9+(homeStrength-awayStrength)*.32+(homeTactic.tempo-50)*.06+rng.integer(-2,4)));
  const shotsAway=Math.max(4,Math.round(9+(awayStrength-homeStrength)*.28+(awayTactic.tempo-50)*.04+rng.integer(-2,3)));
  const events:MatchEvent[]=[{minute:0,type:"kickoff",team:"neutral",text:`Bola rolando. ${home.name} começa com a posse.`}];
  let homeGoals=0,awayGoals=0;
  const chances:Array<{minute:number;team:"home"|"away";goal:boolean}>=[];
  for(let i=0;i<shotsHome;i++)chances.push({minute:rng.integer(3,89),team:"home",goal:rng.next()<Math.max(.07,Math.min(.28,.13+(homeStrength-awayStrength)*.006))});
  for(let i=0;i<shotsAway;i++)chances.push({minute:rng.integer(3,89),team:"away",goal:rng.next()<Math.max(.06,Math.min(.25,.12+(awayStrength-homeStrength)*.006))});
  chances.sort((a,b)=>a.minute-b.minute).forEach(chance=>{
    const club=chance.team==="home"?home:away,opponent=chance.team==="home"?away:home;
    const xi=chance.team==="home"?homeXI:awayXI;
    const attacking=xi.filter(p=>["ATA","PE","PD","MEI","MC"].includes(p.position));
    const attacker=rng.pick(attacking.length?attacking:xi);
    if(chance.goal){
      if(chance.team==="home")homeGoals++;else awayGoals++;
      const assist=assister(rng,xi,attacker);
      events.push({minute:chance.minute,type:"goal",team:chance.team,playerId:attacker.id,assistPlayerId:assist?.id,text:`GOL DO ${club.shortName}! ${attacker.name} finaliza com categoria${assist?` após passe de ${assist.name}`:""} contra o ${opponent.shortName}.`});
    }else events.push({minute:chance.minute,type:"chance",team:chance.team,playerId:attacker.id,text:`${attacker.name} encontra espaço e finaliza, mas a chance não entra.`});
  });
  events.push({minute:45,type:"halftime",team:"neutral",text:"Intervalo. As comissões ajustam posicionamento e intensidade."});
  if(rng.next()<.78){
    const cardHome=rng.next()<.5;
    const cardXI=cardHome?homeXI:awayXI;
    const player=rng.pick(cardXI);
    events.push({minute:rng.integer(51,82),type:"card",team:cardHome?"home":"away",playerId:player.id,text:`Cartão amarelo para ${player.name} após parar o contra-ataque.`});
  }
  for(const [team,xi] of [["home",homeXI],["away",awayXI]] as const){
    if(rng.next()<.08){
      const player=rng.pick(xi);
      events.push({minute:rng.integer(18,84),type:"injury",team,playerId:player.id,text:`${player.name} sente um problema físico e preocupa a comissão médica.`});
    }
  }
  events.push({minute:90,type:"fulltime",team:"neutral",text:`Fim de jogo: ${home.name} ${homeGoals} × ${awayGoals} ${away.name}.`});
  const order=["kickoff","chance","goal","card","injury","halftime","fulltime"];
  events.sort((a,b)=>a.minute-b.minute||(order.indexOf(a.type)-order.indexOf(b.type)));
  return{homeGoals,awayGoals,possessionHome:share,shotsHome,shotsAway,events};
}
