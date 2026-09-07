import type { LeagueWorld } from "./league";
import type { WorldCompetitionsState } from "./world-competitions";
import type { AdvancedWorldState } from "./advanced-world";
import type { ClubAiState } from "./club-ai";
import type { ProfessionalCompetitionId } from "../data/brazil-2026/competitions";

export type ClubTrendPoint={
  year:number;clubName:string;competitionId:ProfessionalCompetitionId;position:number;
  reputationBefore:number;reputationAfter:number;reputationDelta:number;
  marketValueBefore:number;marketValueAfter:number;
  transferBudgetBefore:number;transferBudgetAfter:number;
  wageBudgetBefore:number;wageBudgetAfter:number;
  estimatedRevenueEur:number;estimatedExpensesEur:number;operatingResultEur:number;
  managerName?:string;managerStyle?:string;summary:string;
};
export type ClubDynamicsState={history:Record<string,ClubTrendPoint[]>;lastEvolvedYear?:number};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round100k=(value:number)=>Math.round(value/100_000)*100_000;
const key=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
export function createClubDynamics():ClubDynamicsState{return{history:{}};}
export function hydrateClubDynamics(value:ClubDynamicsState|undefined):ClubDynamicsState{return value?{history:value.history??{},lastEvolvedYear:value.lastEvolvedYear}:createClubDynamics();}
export function clubTrendHistory(value:ClubDynamicsState|undefined,clubName:string){return[...(hydrateClubDynamics(value).history[key(clubName)]??[])].sort((a,b)=>b.year-a.year);}
export function latestClubTrend(value:ClubDynamicsState|undefined,clubName:string){return clubTrendHistory(value,clubName)[0];}

function competitionBase(id:ProfessionalCompetitionId|undefined){
  if(id==="ENG1")return 125_000_000;if(id==="ESP1")return 82_000_000;if(id==="FRA1")return 62_000_000;
  if(id==="BRA1")return 42_000_000;if(id==="ENG2")return 34_000_000;if(id==="ESP2")return 26_000_000;
  if(id==="FRA2")return 22_000_000;if(id==="BRA2")return 15_000_000;return 8_000_000;
}
function continentalImpact(clubId:string,world:WorldCompetitionsState){let reputation=0,prizeSignal=0;for(const t of world.tournaments){const participant=t.participants.find(p=>p.activeClubId===clubId);if(!participant)continue;const matches=t.matches.filter(m=>m.played&&(m.home.activeClubId===clubId||m.away.activeClubId===clubId));if(!matches.length)continue;const champion=t.championId===participant.id,final=matches.some(m=>m.stage==="Final"),semi=matches.some(m=>m.stage==="Semifinal"),quarters=matches.some(m=>m.stage==="Quartas de final");if(champion){reputation+=3;prizeSignal+=18_000_000;}else if(final){reputation+=2;prizeSignal+=10_000_000;}else if(semi){reputation+=1.2;prizeSignal+=6_000_000;}else if(quarters){reputation+=.6;prizeSignal+=3_000_000;}}return{reputation,prizeSignal};}
function playerValue(overall:number,value:number|null){return value??Math.max(250_000,(overall-52)*520_000);}

export function evolveClubDynamics(league:LeagueWorld,year:number,world:WorldCompetitionsState,advanced:AdvancedWorldState,clubAi:ClubAiState|undefined,value:ClubDynamicsState|undefined){
  const state=structuredClone(hydrateClubDynamics(value));if(state.lastEvolvedYear===year)return state;const table=[...league.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor),repOrder=[...league.clubs].sort((a,b)=>b.reputation-a.reputation),n=Math.max(1,league.clubs.length),competitionId=(league.competitionId??"BRA1") as ProfessionalCompetitionId;
  for(const club of league.clubs){const position=Math.max(1,table.findIndex(r=>r.clubId===club.id)+1),expected=Math.max(1,repOrder.findIndex(c=>c.id===club.id)+1),continental=continentalImpact(club.id,world),overperformance=clamp((expected-position)*.45,-2.2,2.2),tableDelta=position===1?3.2:position<=4?1.8:position<=Math.ceil(n*.45)?.7:position>=n-2?-2.3:position>=Math.ceil(n*.8)?-1.1:0,reputationBefore=club.reputation,reputationDelta=Math.round(clamp(tableDelta+overperformance+continental.reputation,-5,5)*10)/10,reputationAfter=clamp(Math.round((reputationBefore+reputationDelta)*10)/10,42,97),marketValueBefore=club.marketValueEur,squadValue=club.players.reduce((sum,p)=>sum+playerValue(p.overall,p.marketValueEur),0),marketValueAfter=round100k(Math.max(3_000_000,marketValueBefore*.62+squadValue*.38*(1+reputationDelta*.012))),transferBudgetBefore=club.transferBudgetEur,wageBudgetBefore=club.wageBudgetBrlMonthly,wageSpend=club.players.reduce((sum,p)=>sum+p.contract.salaryBrlMonthly,0),finance=advanced.finances[club.id],baseRevenue=competitionBase(competitionId),performanceFactor=1.18-(position-1)/Math.max(1,n-1)*.34,commercial=Math.max(2_000_000,reputationAfter*reputationAfter*3200),estimatedRevenueEur=Math.round(baseRevenue*performanceFactor+commercial+continental.prizeSignal+Math.max(0,finance?.prizeMoneyEur??0)),estimatedExpensesEur=Math.round(wageSpend*12/6+marketValueAfter*.032),operatingResultEur=estimatedRevenueEur-estimatedExpensesEur,allocation=Math.max(900_000,marketValueAfter*.026+Math.max(0,operatingResultEur)*.16),transferBudgetAfter=round100k(Math.max(750_000,(transferBudgetBefore*.45+allocation)*(operatingResultEur<0?.88:1)*(1+reputationDelta*.025))),wageGrowth=clamp(1.025+reputationDelta*.014,.94,1.13),wageBudgetAfter=Math.round(Math.max(wageSpend*1.07,wageBudgetBefore*wageGrowth)/10_000)*10_000,manager=clubAi?.managers.find(m=>m.clubId===club.id),summary=reputationDelta>=2?"O clube valorizou esportivamente e ganhou poder de mercado.":reputationDelta<=-2?"A temporada reduziu prestígio e apertou a capacidade de investimento.":operatingResultEur>=0?"O clube fechou o ciclo de forma estável e sustentável.":"O desempenho esportivo segurou parte da pressão financeira.";
    club.reputation=reputationAfter;club.marketValueEur=marketValueAfter;club.transferBudgetEur=transferBudgetAfter;club.wageBudgetBrlMonthly=wageBudgetAfter;const point:ClubTrendPoint={year,clubName:club.name,competitionId,position,reputationBefore,reputationAfter,reputationDelta,marketValueBefore,marketValueAfter,transferBudgetBefore,transferBudgetAfter,wageBudgetBefore,wageBudgetAfter,estimatedRevenueEur,estimatedExpensesEur,operatingResultEur,managerName:manager?.managerName,managerStyle:manager?.style,summary},k=key(club.name);state.history[k]=[point,...(state.history[k]??[]).filter(x=>x.year!==year)].slice(0,30);
  }
  state.lastEvolvedYear=year;return state;
}
