import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer, LeagueWorld, PlayerPersonality } from "./league";

export type PlayerRetirementRecord={
  year:number;playerId:string;name:string;clubId:string;clubName:string;position:string;age:number;overall:number;peakOverall:number;appearances:number;goals:number;assists:number;reason:"Aposentadoria"|"Limite de idade";
};
export type YouthIntakeRecord={
  year:number;clubId:string;clubName:string;playerIds:string[];bestPotential:number;
};
export type PlayerLifecycleState={
  lastProcessedYear?:number;
  retirements:PlayerRetirementRecord[];
  youthIntakes:YouthIntakeRecord[];
  squadTargets:Record<string,number>;
};
export type PlayerLifecycleTransition={state:PlayerLifecycleState;retired:PlayerRetirementRecord[];generated:LeaguePlayer[]};

const POSITIONS=["GOL","ZAG","ZAG","LD","LE","VOL","MC","MEI","PE","PD","ATA"];
const PERSONALITIES:PlayerPersonality[]=["Profissional","Ambicioso","Competitivo","Leal","Reservado","Temperamental"];
const NAME_POOLS={
  Brasil:{first:["Arthur","Caio","Davi","Enzo","Gabriel","João","Lucas","Matheus","Pedro","Rafael","Samuel","Vinícius"],last:["Almeida","Costa","Ferreira","Gomes","Lima","Martins","Oliveira","Pereira","Ramos","Rocha","Silva","Souza"]},
  Inglaterra:{first:["Archie","Ben","Charlie","Ethan","George","Harry","Jack","James","Leo","Noah","Oliver","Theo"],last:["Bennett","Brown","Clark","Davies","Evans","Hughes","Johnson","Miller","Roberts","Smith","Taylor","Wilson"]},
  Espanha:{first:["Adrián","Álvaro","Daniel","Diego","Hugo","Iván","Javier","Lucas","Marc","Mateo","Pablo","Sergio"],last:["Alonso","Castro","García","Gómez","López","Martín","Moreno","Navarro","Ruiz","Sánchez","Serrano","Torres"]},
  França:{first:["Adam","Antoine","Enzo","Hugo","Jules","Léo","Louis","Lucas","Mathis","Nathan","Noah","Raphaël"],last:["Bernard","Dubois","Fontaine","Garnier","Laurent","Lefèvre","Martin","Mercier","Moreau","Roux","Simon","Thomas"]},
  Geral:{first:["Alex","Daniel","David","Emil","Gabriel","Leo","Lucas","Marco","Mateo","Nico","Samuel","Victor"],last:["Costa","Garcia","Ivanov","Martinez","Meyer","Müller","Novak","Rossi","Silva","Santos","Schmidt","Varga"]},
} as const;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function createPlayerLifecycleState():PlayerLifecycleState{return{retirements:[],youthIntakes:[],squadTargets:{}};}
export function hydratePlayerLifecycleState(state:PlayerLifecycleState|undefined):PlayerLifecycleState{return{lastProcessedYear:state?.lastProcessedYear,retirements:state?.retirements??[],youthIntakes:state?.youthIntakes??[],squadTargets:state?.squadTargets??{}};}

function homeNationality(club:LeagueClub){
  const counts=new Map<string,number>();for(const player of club.players){if(!player.nationality)continue;counts.set(player.nationality,(counts.get(player.nationality)??0)+1);}return[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??"Brasil";
}
function namePool(nationality:string){if(nationality==="Brasil")return NAME_POOLS.Brasil;if(nationality==="Inglaterra")return NAME_POOLS.Inglaterra;if(nationality==="Espanha")return NAME_POOLS.Espanha;if(nationality==="França")return NAME_POOLS.França;return NAME_POOLS.Geral;}
function peakOverall(player:LeaguePlayer){return Math.max(player.overall,...(player.overallHistory??[]).map(point=>point.overall));}
function retirementChance(player:LeaguePlayer){
  const keeper=player.position==="GOL",age=player.age,minimum=keeper?37:35,hardCap=keeper?43:41;if(age>=hardCap)return 1;if(age<minimum)return 0;
  const effective=age-(keeper?2:0);let chance=effective===35?.05:effective===36?.1:effective===37?.22:effective===38?.42:effective===39?.68:.88;
  if(player.contract.endYear<=new Date().getUTCFullYear())chance+=.08;
  if(player.personality==="Profissional")chance-=.04;if(player.personality==="Competitivo")chance-=.02;
  return clamp(chance,.01,.98);
}
function shouldRetire(player:LeaguePlayer,seed:string,year:number){
  const keeper=player.position==="GOL",hardCap=keeper?43:41;if(player.age>=hardCap)return{retire:true,reason:"Limite de idade" as const};
  const rng=new SeededRng(`${seed}:retirement:${year}:${player.id}`);return{retire:rng.next()<retirementChance(player),reason:"Aposentadoria" as const};
}
function academyPosition(club:LeagueClub,index:number){
  const counts=new Map<string,number>();for(const player of club.players)counts.set(player.position,(counts.get(player.position)??0)+1);
  const scarce=[...POSITIONS].sort((a,b)=>(counts.get(a)??0)-(counts.get(b)??0));return scarce[index%Math.min(4,scarce.length)]??POSITIONS[index%POSITIONS.length];
}
function createAcademyPlayer(club:LeagueClub,index:number,year:number,seed:string):LeaguePlayer{
  const rng=new SeededRng(`${seed}:academy:${year}:${club.id}:${index}`),age=rng.integer(17,19),nationality=homeNationality(club),pool=namePool(nationality),position=academyPosition(club,index);
  const reputationBase=Math.round(club.reputation*.52),overall=clamp(reputationBase+rng.integer(12,23),48,72),potential=clamp(overall+rng.integer(8,19)+(rng.integer(1,100)<=8?rng.integer(2,5):0),overall,95),name=`${rng.pick([...pool.first])} ${rng.pick([...pool.last])}`;
  return{id:`${club.id}-academy-${year}-${index}`,transfermarktId:`academy-${year}-${club.id}-${index}`,name,position,age,nationality,marketValueEur:null,overall,potential,seasonStartOverall:overall,developmentProgress:0,overallHistory:[{year,round:0,overall,reason:"início"}],morale:74,condition:98,fatigue:1,form:6.4,goals:0,assists:0,shots:0,yellowCards:0,redCards:0,wins:0,draws:0,losses:0,cleanSheets:0,ratingTotal:0,ratedMatches:0,averageRating:0,lastRating:0,injuryDays:0,suspensionMatches:0,status:"Promessa",personality:rng.pick(PERSONALITIES),squadRole:"Promessa",happiness:78,managerTrust:60,appearances:0,starts:0,minutes:0,promises:[],contract:{salaryBrlMonthly:Math.max(20_000,Math.round(overall*750/5_000)*5_000),startYear:year,endYear:year+4,agentName:"Representante da base",releaseClauseEur:null},transferListed:false,wantsToLeave:false,joinedClubYear:year,clubTrainedYears:0,associationTrained:false,generated:true,academyOriginClubId:club.id,academyOriginClubName:club.name,generatedYear:year};
}

export function applyPlayerLifecycleTransition(league:LeagueWorld,lifecycle:PlayerLifecycleState|undefined,seed:string,year:number):PlayerLifecycleTransition{
  const state=structuredClone(hydratePlayerLifecycleState(lifecycle));if(state.lastProcessedYear===year)return{state,retired:[],generated:[]};
  const retired:PlayerRetirementRecord[]=[],generated:LeaguePlayer[]=[];
  for(const club of league.clubs){
    const before=club.players.length,target=state.squadTargets[club.name]??Math.max(22,Math.min(32,before));state.squadTargets[club.name]=target;
    const survivors:LeaguePlayer[]=[];for(const player of club.players){const decision=shouldRetire(player,seed,year);if(!decision.retire){survivors.push(player);continue;}retired.push({year,playerId:player.id,name:player.name,clubId:club.id,clubName:club.name,position:player.position,age:player.age,overall:player.overall,peakOverall:peakOverall(player),appearances:player.appearances??0,goals:player.goals??0,assists:player.assists??0,reason:decision.reason});}
    club.players=survivors;
    const young=club.players.filter(player=>player.age<=20).length,academyNeed=Math.max(0,3-young),desired=Math.max(target,Math.min(32,club.players.length+academyNeed));const intake:LeaguePlayer[]=[];
    for(let index=1;club.players.length<desired;index++){const prospect=createAcademyPlayer(club,index,year,seed);if(club.players.some(player=>player.id===prospect.id))continue;club.players.push(prospect);intake.push(prospect);generated.push(prospect);}
    if(intake.length)state.youthIntakes.unshift({year,clubId:club.id,clubName:club.name,playerIds:intake.map(player=>player.id),bestPotential:Math.max(...intake.map(player=>player.potential))});
  }
  state.retirements=[...retired,...state.retirements].slice(0,1000);state.youthIntakes=state.youthIntakes.slice(0,500);state.lastProcessedYear=year;return{state,retired,generated};
}
