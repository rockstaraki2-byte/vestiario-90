import{SeededRng}from"./rng";
import{professionalCompetitionById,competitionStartDate,type CompetitionClubRoster,type ProfessionalCompetitionId}from"../data/brazil-2026/competitions";

export type PlayerPersonality="Profissional"|"Ambicioso"|"Competitivo"|"Leal"|"Reservado"|"Temperamental";
export type SquadRole="Líder"|"Titular"|"Rotação"|"Reserva"|"Promessa";
export type PlayerPromise={id:string;type:"Mais minutos";createdRound:number;deadlineRound:number;targetAppearances:number;progressAppearances:number;status:"Ativa"|"Cumprida"|"Quebrada"};
export type PlayerContract={salaryBrlMonthly:number;startYear:number;endYear:number;agentName:string;releaseClauseEur:number|null};
export type LeaguePlayer={
 id:string;transfermarktId:string;name:string;position:string;age:number;marketValueEur:number|null;marketValueUpdated?:string;overall:number;morale:number;condition:number;fatigue:number;form:number;goals:number;assists:number;yellowCards:number;injuryDays:number;suspensionMatches:number;status:string;personality:PlayerPersonality;squadRole:SquadRole;happiness:number;managerTrust:number;appearances:number;starts:number;minutes:number;promises:PlayerPromise[];contract:PlayerContract;transferListed:boolean;wantsToLeave:boolean;lastConversationRound?:number;
};
export type LeagueClub={id:string;sourceId:number;transfermarktId:number;name:string;shortName:string;imageUrl:string;color:string;reputation:number;marketValueEur:number;transferBudgetEur:number;wageBudgetBrlMonthly:number;players:LeaguePlayer[]};
export type LeagueFixture={id:string;round:number;homeClubId:string;awayClubId:string;played:boolean;date?:string;homeGoals?:number;awayGoals?:number};
export type LeagueStanding={clubId:string;played:number;won:number;drawn:number;lost:number;goalsFor:number;goalsAgainst:number;points:number};
export type LeagueWorld={clubs:LeagueClub[];fixtures:LeagueFixture[];standings:LeagueStanding[];competitionId?:ProfessionalCompetitionId;competitionName?:string;totalRounds?:number};

const COLORS=["#159447","#d33e34","#151515","#d43832","#ececec","#4a78d0","#d84137","#2b6fdd","#111111","#222222","#6c1f35","#171717","#2b78c5","#d42d2d","#e9e9e9","#d43b2d","#208251","#d5e7e2","#e0bd2b","#1e4ea3"];
const PERSONALITIES:PlayerPersonality[]=["Profissional","Ambicioso","Competitivo","Leal","Reservado","Temperamental"];
const AGENTS=["André Moraes","Bruno Salles","Carlos Faria","Diego Neves","Eduardo Lima","Felipe Tavares","Gustavo Nunes","Henrique Prado","Igor Martins","João Vilela","Lucas Freire","Marcelo Rezende"];

function simulatedSalary(valueEur:number|null,overall:number,age:number,rng:SeededRng){const marketBase=valueEur?valueEur*.032:Math.max(90_000,(overall-55)*24_000);const ageFactor=age<=21?.72:age>=33?.78:1;return Math.max(35_000,Math.round((marketBase*ageFactor*(rng.integer(86,114)/100))/5_000)*5_000);}
function assignRoles(players:LeaguePlayer[]){const ranked=[...players].sort((a,b)=>b.overall-a.overall);ranked.forEach((player,index)=>{const role:SquadRole=player.age<=21&&index>10?"Promessa":index<3?"Líder":index<11?"Titular":index<18?"Rotação":index<25?"Reserva":"Promessa";player.squadRole=role;player.status=role;if(role==="Líder")player.managerTrust=Math.min(100,player.managerTrust+8);});}
function strengthRange(id:ProfessionalCompetitionId){return id==="BRA1"?[61,86]as const:id==="BRA2"?[57,79]as const:[52,74]as const;}
function reputationRange(id:ProfessionalCompetitionId){return id==="BRA1"?[58,88]as const:id==="BRA2"?[48,75]as const:[40,68]as const;}
function generatePlayers(clubId:string,roster:CompetitionClubRoster,rng:SeededRng,year:number,competitionId:ProfessionalCompetitionId):LeaguePlayer[]{
 const [minOverall,maxOverall]=strengthRange(competitionId);
 const players=roster.players.map((identity,index):LeaguePlayer=>{const overall=rng.integer(minOverall,maxOverall),salary=simulatedSalary(identity.marketValueEur,overall,identity.age,rng),endYear=year+rng.integer(identity.age>=32?1:1,identity.age<=23?4:3),clause=identity.marketValueEur&&identity.age<31?Math.round(identity.marketValueEur*(rng.integer(140,220)/100)/100_000)*100_000:null;return{id:`${clubId}-p${index+1}`,transfermarktId:identity.transfermarktId,name:identity.name,position:identity.position,age:identity.age,marketValueEur:identity.marketValueEur,marketValueUpdated:identity.marketValueUpdated,overall,morale:rng.integer(66,86),condition:rng.integer(88,100),fatigue:rng.integer(0,9),form:rng.integer(5,8),goals:0,assists:0,yellowCards:0,injuryDays:0,suspensionMatches:0,status:"Reserva",personality:rng.pick(PERSONALITIES),squadRole:"Reserva",happiness:rng.integer(64,88),managerTrust:rng.integer(54,76),appearances:0,starts:0,minutes:0,promises:[],contract:{salaryBrlMonthly:salary,startYear:year,endYear,agentName:rng.pick(AGENTS),releaseClauseEur:clause},transferListed:false,wantsToLeave:false};});assignRoles(players);return players;
}
function addDays(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
export function generateFixtures(clubIds:string[],startDate="2026-01-28",roundCadenceDays=7,doubleRoundRobin=true):LeagueFixture[]{
 const teams=[...clubIds];if(teams.length%2)teams.push("BYE");const fixed=teams[0],rotating=teams.slice(1),half=teams.length/2,first:LeagueFixture[]=[];
 for(let round=1;round<teams.length;round++){const row=[fixed,...rotating];for(let i=0;i<half;i++){const a=row[i],b=row[row.length-1-i];if(a!=="BYE"&&b!=="BYE"){const swap=(round+i)%2===0;first.push({id:`r${round}-${a}-${b}`,round,homeClubId:swap?b:a,awayClubId:swap?a:b,played:false,date:addDays(startDate,(round-1)*roundCadenceDays)});}}rotating.unshift(rotating.pop()!);}
 if(!doubleRoundRobin)return first;const offset=teams.length-1;return[...first,...first.map(f=>({...f,id:`r${f.round+offset}-${f.awayClubId}-${f.homeClubId}`,round:f.round+offset,homeClubId:f.awayClubId,awayClubId:f.homeClubId,date:addDays(startDate,(f.round+offset-1)*roundCadenceDays)}))];
}
export function createLeague(seed:string,year=2026,competitionId:ProfessionalCompetitionId="BRA1"):LeagueWorld{
 const competition=professionalCompetitionById(competitionId),rng=new SeededRng(seed),[repMin,repMax]=reputationRange(competitionId);
 const clubs=competition.clubs.map((identity,index)=>{const id=`club-${index+1}`,players=generatePlayers(id,identity,rng,year,competitionId),wageSpend=players.reduce((sum,p)=>sum+p.contract.salaryBrlMonthly,0);return{id,sourceId:identity.sourceId,transfermarktId:identity.transfermarktId,name:identity.name,shortName:identity.shortName,imageUrl:identity.imageUrl,color:COLORS[index%COLORS.length],reputation:rng.integer(repMin,repMax),marketValueEur:identity.marketValueEur,transferBudgetEur:Math.max(800_000,Math.round(identity.marketValueEur*(rng.integer(8,16)/100)/100_000)*100_000),wageBudgetBrlMonthly:Math.round(wageSpend*(rng.integer(112,125)/100)/10_000)*10_000,players};});
 const fixtures=generateFixtures(clubs.map(c=>c.id),competitionStartDate(competitionId,year),competition.roundCadenceDays,competition.doubleRoundRobin);
 return{clubs,fixtures,standings:clubs.map(c=>({clubId:c.id,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0})),competitionId,competitionName:competition.name,totalRounds:Math.max(...fixtures.map(f=>f.round),0)};
}
export function sortedStandings(world:LeagueWorld):LeagueStanding[]{return[...world.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor);}
export function playerAvailability(player:LeaguePlayer):"Lesionado"|"Suspenso"|"Disponível"{if(player.injuryDays>0)return"Lesionado";if(player.suspensionMatches>0)return"Suspenso";return"Disponível";}
