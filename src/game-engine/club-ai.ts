import { SeededRng } from "./rng";
import type { LeagueWorld } from "./league";
import type { Formation, MatchTactic, Mentality } from "./match";

export type ManagerStyle="Posse"|"Pressão alta"|"Transição"|"Bloco baixo"|"Equilibrado";
export type ClubManagerProfile={
  clubId:string;managerName:string;style:ManagerStyle;formation:Formation;mentality:Mentality;
  pressing:number;tempo:number;youthTrust:number;transferAggression:number;patience:number;
  jobSecurity:number;hiredRound:number;lossStreak:number;unbeatenStreak:number;
};
export type ManagerMovement={id:string;round:number;clubId:string;clubName:string;oldManager:string;newManager:string;reason:string};
export type ClubAiState={sequence:number;managers:ClubManagerProfile[];history:ManagerMovement[];lastProcessedRound?:number};

const FIRST=["Rafael","André","Marcelo","Bruno","Eduardo","Thiago","Diego","Gustavo","Daniel","Ricardo","Martín","Sergio","Luis","Carlos","Javier","Julien","Laurent","Thomas","Marco","Nuno"];
const LAST=["Almeida","Moraes","Ferreira","Santos","Barbosa","Tavares","Costa","Ribeiro","Mendes","Pereira","Martínez","García","López","Dubois","Moreau","Lefèvre","Smith","Walker","Bennett","Silva"];
const STYLES:ManagerStyle[]=["Posse","Pressão alta","Transição","Bloco baixo","Equilibrado"];
const FORMATIONS:Formation[]=["4-2-3-1","4-3-3","4-4-2"];

function managerName(rng:SeededRng){return`${rng.pick(FIRST)} ${rng.pick(LAST)}`;}
function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,Math.round(v)));}
function styleDefaults(style:ManagerStyle){
  if(style==="Posse")return{mentality:"Equilibrada" as Mentality,pressing:64,tempo:52};
  if(style==="Pressão alta")return{mentality:"Ofensiva" as Mentality,pressing:82,tempo:72};
  if(style==="Transição")return{mentality:"Ofensiva" as Mentality,pressing:60,tempo:79};
  if(style==="Bloco baixo")return{mentality:"Defensiva" as Mentality,pressing:38,tempo:46};
  return{mentality:"Equilibrada" as Mentality,pressing:58,tempo:58};
}
function makeManager(clubId:string,rng:SeededRng,round:number):ClubManagerProfile{
  const style=rng.pick(STYLES),defaults=styleDefaults(style);
  return{clubId,managerName:managerName(rng),style,formation:rng.pick(FORMATIONS),mentality:defaults.mentality,pressing:clamp(defaults.pressing+rng.integer(-7,7)),tempo:clamp(defaults.tempo+rng.integer(-7,7)),youthTrust:rng.integer(35,88),transferAggression:rng.integer(35,92),patience:rng.integer(38,82),jobSecurity:rng.integer(62,84),hiredRound:round,lossStreak:0,unbeatenStreak:0};
}
export function createClubAiState(league:LeagueWorld,seed:string):ClubAiState{
  const rng=new SeededRng(`${seed}:club-ai:init`);
  return{sequence:0,managers:league.clubs.map(club=>makeManager(club.id,rng,1)),history:[]};
}
export function hydrateClubAi(state:ClubAiState|undefined,league:LeagueWorld,seed:string):ClubAiState{
  if(!state)return createClubAiState(league,seed);
  const rng=new SeededRng(`${seed}:club-ai:hydrate`),existing=new Map(state.managers.map(item=>[item.clubId,item]));
  return{...state,managers:league.clubs.map(club=>existing.get(club.id)??makeManager(club.id,rng,1)),history:state.history??[]};
}
export function tacticForClub(state:ClubAiState|undefined,clubId:string):MatchTactic{
  const manager=state?.managers.find(item=>item.clubId===clubId);
  if(!manager)return{formation:"4-2-3-1",mentality:"Equilibrada",pressing:58,tempo:58};
  return{formation:manager.formation,mentality:manager.mentality,pressing:manager.pressing,tempo:manager.tempo};
}
export function managerForClub(state:ClubAiState|undefined,clubId:string){return state?.managers.find(item=>item.clubId===clubId);}

export function processClubAiRound(state:ClubAiState,league:LeagueWorld,round:number,seed:string):ClubAiState{
  if(state.lastProcessedRound===round)return state;
  const next:ClubAiState={...state,lastProcessedRound:round,managers:state.managers.map(item=>({...item})),history:[...state.history]};
  const rng=new SeededRng(`${seed}:club-ai:r${round}`);
  const table=[...league.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));
  for(const manager of next.managers){
    const club=league.clubs.find(item=>item.id===manager.clubId),standing=table.find(item=>item.clubId===manager.clubId);if(!club||!standing)continue;
    const position=table.findIndex(item=>item.clubId===manager.clubId)+1;
    const latest=league.fixtures.filter(f=>f.played&&(f.homeClubId===club.id||f.awayClubId===club.id)).sort((a,b)=>b.round-a.round)[0];
    let delta=0;
    if(latest){const gf=latest.homeClubId===club.id?(latest.homeGoals??0):(latest.awayGoals??0),ga=latest.homeClubId===club.id?(latest.awayGoals??0):(latest.homeGoals??0);if(gf>ga){delta=4;manager.lossStreak=0;manager.unbeatenStreak++;}else if(gf<ga){delta=-6;manager.lossStreak++;manager.unbeatenStreak=0;}else{delta=1;manager.lossStreak=0;manager.unbeatenStreak++;}}
    const expectation=club.reputation>=82?6:club.reputation>=72?10:14;
    if(position>expectation+4)delta-=3;if(position<=Math.max(4,expectation-4))delta+=2;
    manager.jobSecurity=clamp(manager.jobSecurity+delta);
    if(manager.lossStreak>=3){manager.mentality=manager.mentality==="Ofensiva"?"Equilibrada":manager.mentality;manager.pressing=clamp(manager.pressing-rng.integer(2,7),30,90);}
    if(manager.unbeatenStreak>=4){manager.tempo=clamp(manager.tempo+rng.integer(1,4),35,90);manager.pressing=clamp(manager.pressing+rng.integer(1,4),30,90);}
    const sackThreshold=Math.max(13,28-Math.round(manager.patience/8));
    if(round>=5&&manager.jobSecurity<=sackThreshold){
      const oldManager=manager.managerName,replacement=makeManager(club.id,rng,round);Object.assign(manager,replacement,{jobSecurity:68});
      next.sequence++;next.history.unshift({id:`manager-move-${next.sequence}`,round,clubId:club.id,clubName:club.name,oldManager,newManager:manager.managerName,reason:`sequência ruim e ${position}º lugar`});
    }
  }
  return next;
}

export function prepareClubAiNextSeason(state:ClubAiState,league:LeagueWorld,seed:string):ClubAiState{
  const hydrated=hydrateClubAi(state,league,seed);return{...hydrated,lastProcessedRound:undefined,managers:hydrated.managers.map(manager=>({...manager,jobSecurity:clamp(Math.max(55,manager.jobSecurity)),lossStreak:0,unbeatenStreak:0,hiredRound:manager.hiredRound}))};
}
