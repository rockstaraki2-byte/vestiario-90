import { SeededRng } from "./rng";
import { PROFESSIONAL_COMPETITIONS, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";
import type { LeagueWorld } from "./league";

export type WorldCompetitionId="CDB"|"LIB"|"SUD"|"FAC"|"CDR"|"CDF"|"UCL"|"UEL"|"UECL";
export type WorldCompetitionKind="Copa nacional"|"Continental";
export type WorldCompetitionDefinition={id:WorldCompetitionId;name:string;shortName:string;country?:string;kind:WorldCompetitionKind;participants:number;roundInterval:number};
export type WorldParticipant={id:string;name:string;shortName:string;country:string;reputation:number;activeClubId?:string};
export type WorldCompetitionMatch={id:string;competitionId:WorldCompetitionId;stage:string;roundDue:number;home:WorldParticipant;away:WorldParticipant;played:boolean;homeGoals?:number;awayGoals?:number;winnerId?:string};
export type WorldTournamentState={definition:WorldCompetitionDefinition;participants:WorldParticipant[];matches:WorldCompetitionMatch[];currentStage:string;championId?:string;completed:boolean};
export type WorldCompetitionsState={season:number;tournaments:WorldTournamentState[];lastProcessedRound?:number;history:Array<{year:number;competitionId:WorldCompetitionId;competitionName:string;championName:string}>};

export const WORLD_COMPETITIONS:WorldCompetitionDefinition[]=[
 {id:"CDB",name:"Copa do Brasil",shortName:"Copa do Brasil",country:"Brasil",kind:"Copa nacional",participants:32,roundInterval:4},
 {id:"LIB",name:"CONMEBOL Libertadores",shortName:"Libertadores",kind:"Continental",participants:32,roundInterval:4},
 {id:"SUD",name:"CONMEBOL Sudamericana",shortName:"Sul-Americana",kind:"Continental",participants:32,roundInterval:4},
 {id:"FAC",name:"FA Cup",shortName:"FA Cup",country:"Inglaterra",kind:"Copa nacional",participants:32,roundInterval:4},
 {id:"CDR",name:"Copa del Rey",shortName:"Copa del Rey",country:"Espanha",kind:"Copa nacional",participants:32,roundInterval:4},
 {id:"CDF",name:"Coupe de France",shortName:"Coupe de France",country:"França",kind:"Copa nacional",participants:32,roundInterval:4},
 {id:"UCL",name:"UEFA Champions League",shortName:"Champions League",kind:"Continental",participants:32,roundInterval:4},
 {id:"UEL",name:"UEFA Europa League",shortName:"Europa League",kind:"Continental",participants:32,roundInterval:4},
 {id:"UECL",name:"UEFA Conference League",shortName:"Conference League",kind:"Continental",participants:32,roundInterval:4},
];

function repFromValue(value:number){if(value>=1_000_000_000)return 95;if(value>=600_000_000)return 90;if(value>=300_000_000)return 84;if(value>=150_000_000)return 78;if(value>=70_000_000)return 72;if(value>=30_000_000)return 66;if(value>=12_000_000)return 59;return 52;}
function sourceCountry(id:ProfessionalCompetitionId){return id.startsWith("BRA")?"Brasil":id==="ENG1"?"Inglaterra":id==="ESP1"?"Espanha":"França";}
function allExternalParticipants(activeCompetitionId:ProfessionalCompetitionId,league:LeagueWorld){
 const active=league.clubs.map(club=>({id:`active:${club.id}`,name:club.name,shortName:club.shortName,country:sourceCountry(activeCompetitionId),reputation:club.reputation,activeClubId:club.id}));
 const external=PROFESSIONAL_COMPETITIONS.flatMap(comp=>comp.id===activeCompetitionId?[]:comp.clubs.map(club=>({id:`ext:${comp.id}:${club.transfermarktId}`,name:club.name,shortName:club.shortName,country:comp.country,reputation:repFromValue(club.marketValueEur)})));
 return[...active,...external];
}
function knockoutStages(size:number){const result:string[]=[];let current=size;while(current>2){result.push(current===32?"16 avos":current===16?"Oitavas de final":current===8?"Quartas de final":"Semifinal");current=Math.floor(current/2);}result.push("Final");return result;}
function chooseParticipants(def:WorldCompetitionDefinition,pool:WorldParticipant[],activeCountry:string,rng:SeededRng){
 let candidates:WorldParticipant[];
 if(def.kind==="Copa nacional")candidates=pool.filter(p=>p.country===def.country);
 else if(def.id==="LIB"||def.id==="SUD")candidates=pool.filter(p=>p.country==="Brasil");
 else candidates=pool.filter(p=>["Inglaterra","Espanha","França"].includes(p.country));
 const ranked=[...candidates].sort((a,b)=>b.reputation-a.reputation);
 if(def.id==="SUD")ranked.reverse();
 if(def.id==="UEL")ranked.splice(0,Math.min(10,ranked.length));
 if(def.id==="UECL")ranked.splice(0,Math.min(18,ranked.length));
 const selected:WorldParticipant[]=[];
 const activeCountryClubs=ranked.filter(p=>p.activeClubId&&p.country===activeCountry);
 for(const participant of activeCountryClubs){if(selected.length>=Math.min(6,def.participants))break;selected.push(participant);}
 for(const participant of ranked){if(selected.length>=def.participants)break;if(!selected.some(p=>p.id===participant.id))selected.push(participant);}
 while(selected.length>2&&(selected.length&(selected.length-1))!==0)selected.pop();
 return rng.shuffle?selected:selected.sort(()=>0);
}
function pairRound(def:WorldCompetitionDefinition,participants:WorldParticipant[],stage:string,roundDue:number,rng:SeededRng){
 const shuffled=[...participants];for(let i=shuffled.length-1;i>0;i--){const j=rng.integer(0,i);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const matches:WorldCompetitionMatch[]=[];for(let i=0;i<shuffled.length;i+=2){if(!shuffled[i+1])continue;matches.push({id:`${def.id}:${stage}:${roundDue}:${i/2}`,competitionId:def.id,stage,roundDue,home:shuffled[i],away:shuffled[i+1],played:false});}return matches;
}
function stageForParticipants(count:number){return count>=32?"16 avos":count===16?"Oitavas de final":count===8?"Quartas de final":count===4?"Semifinal":"Final";}
function simulate(match:WorldCompetitionMatch,rng:SeededRng){const homeEdge=2,delta=(match.home.reputation-match.away.reputation)*.035+homeEdge*.1;let hg=Math.max(0,rng.integer(0,2)+(delta>1?1:0)),ag=Math.max(0,rng.integer(0,2)+(delta<-1?1:0));if(hg===ag){if(rng.integer(1,100)<=Math.max(20,Math.min(80,50+(match.home.reputation-match.away.reputation))))hg++;else ag++;}match.homeGoals=hg;match.awayGoals=ag;match.played=true;match.winnerId=hg>ag?match.home.id:match.away.id;}

export function createWorldCompetitions(activeCompetitionId:ProfessionalCompetitionId,league:LeagueWorld,year:number,seed:string):WorldCompetitionsState{
 const rng=new SeededRng(`${seed}:world-competitions:${year}`),pool=allExternalParticipants(activeCompetitionId,league),country=sourceCountry(activeCompetitionId);
 const relevant=WORLD_COMPETITIONS.filter(def=>def.kind==="Continental"||def.country===country);
 const tournaments=relevant.map(def=>{const participants=chooseParticipants(def,pool,country,rng),stage=stageForParticipants(participants.length),matches=pairRound(def,participants,stage,Math.max(2,def.roundInterval),rng);return{definition:def,participants,matches,currentStage:stage,completed:false} satisfies WorldTournamentState;});
 return{season:year,tournaments,history:[]};
}
export function hydrateWorldCompetitions(state:WorldCompetitionsState|undefined,activeCompetitionId:ProfessionalCompetitionId,league:LeagueWorld,year:number,seed:string){return state??createWorldCompetitions(activeCompetitionId,league,year,seed);}
export function processWorldCompetitions(state:WorldCompetitionsState,round:number,seed:string):WorldCompetitionsState{
 if(state.lastProcessedRound===round)return state;const next:WorldCompetitionsState={...state,lastProcessedRound:round,tournaments:state.tournaments.map(t=>({...t,participants:[...t.participants],matches:t.matches.map(m=>({...m,home:{...m.home},away:{...m.away}}))})),history:[...state.history]};
 const rng=new SeededRng(`${seed}:world-cups:r${round}`);
 for(const tournament of next.tournaments){if(tournament.completed)continue;const due=tournament.matches.filter(match=>!match.played&&match.roundDue<=round);if(!due.length)continue;for(const match of due)simulate(match,rng);
  const stageMatches=tournament.matches.filter(match=>match.stage===tournament.currentStage);if(stageMatches.length&&stageMatches.every(match=>match.played)){
   const winners=stageMatches.map(match=>match.winnerId===match.home.id?match.home:match.away);
   if(winners.length===1){tournament.completed=true;tournament.championId=winners[0].id;next.history.unshift({year:next.season,competitionId:tournament.definition.id,competitionName:tournament.definition.name,championName:winners[0].name});}
   else{const nextStage=stageForParticipants(winners.length),roundDue=round+tournament.definition.roundInterval;tournament.currentStage=nextStage;tournament.matches.push(...pairRound(tournament.definition,winners,nextStage,roundDue,rng));}
  }
 }
 return next;
}
export function prepareWorldCompetitionsNextSeason(state:WorldCompetitionsState,activeCompetitionId:ProfessionalCompetitionId,league:LeagueWorld,year:number,seed:string){const fresh=createWorldCompetitions(activeCompetitionId,league,year,seed);fresh.history=[...state.history,...fresh.history].slice(0,80);return fresh;}
export function userWorldCompetitionMatches(state:WorldCompetitionsState,clubId:string){return state.tournaments.flatMap(t=>t.matches.filter(m=>m.home.activeClubId===clubId||m.away.activeClubId===clubId).map(match=>({tournament:t,match})));}
