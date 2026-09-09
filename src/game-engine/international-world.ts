import { NATIONAL_TEAMS_2026, WORLD_CUP_2026_GROUPS } from "../data/national-teams-2026";
import { nationalSpectatorResult, worldNationalFixturesForSeason, type NationalWorldFixture, type NationalSpectatorResult } from "./international-calendar";
import { SeededRng } from "./rng";

export type WorldCupStanding={
 group:string;
 teamId:string;
 teamName:string;
 played:number;
 won:number;
 drawn:number;
 lost:number;
 goalsFor:number;
 goalsAgainst:number;
 goalDifference:number;
 points:number;
 position:number;
 qualification:"Classificado"|"Melhor terceiro"|"Em disputa"|"Eliminado";
};

export type InternationalWorldMatch=NationalWorldFixture&{
 played:boolean;
 homeGoals?:number;
 awayGoals?:number;
 winnerTeamId?:string;
 decidedByPenalties?:boolean;
 result?:NationalSpectatorResult;
};

export type WorldCupSnapshot={
 year:number;
 groupTables:Record<string,WorldCupStanding[]>;
 matches:InternationalWorldMatch[];
 groupMatches:InternationalWorldMatch[];
 knockoutMatches:InternationalWorldMatch[];
 currentStage:string;
 championName?:string;
};

const teamId=(name:string)=>NATIONAL_TEAMS_2026.find(team=>team.name===name)?.id??name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-");
const teamReputation=(name:string)=>NATIONAL_TEAMS_2026.find(team=>team.name===name)?.reputation??70;
const iso=(year:number,tail:string)=>`${year}-${tail}`;

function resolvedMatch(fixture:NationalWorldFixture,seed:string,currentDate:string,knockout=false):InternationalWorldMatch{
 const played=fixture.date<=currentDate;
 if(!played)return{...fixture,played:false};
 const result=nationalSpectatorResult(fixture,seed);
 let winnerTeamId:string|undefined,decidedByPenalties=false;
 if(result.homeGoals>result.awayGoals)winnerTeamId=fixture.homeTeamId;
 else if(result.awayGoals>result.homeGoals)winnerTeamId=fixture.awayTeamId;
 else if(knockout){
  decidedByPenalties=true;
  const rng=new SeededRng(`${seed}:international-penalties:${fixture.id}`);
  winnerTeamId=rng.next()>=.5?fixture.homeTeamId:fixture.awayTeamId;
 }
 return{...fixture,played:true,homeGoals:result.homeGoals,awayGoals:result.awayGoals,winnerTeamId,decidedByPenalties,result};
}

function groupTables(year:number,seed:string,currentDate:string){
 const fixtures=worldNationalFixturesForSeason(year,seed).filter(fixture=>fixture.competition==="Copa do Mundo"&&fixture.stage.startsWith("Grupo "));
 const matches=fixtures.map(fixture=>resolvedMatch(fixture,seed,currentDate));
 const tables:Record<string,WorldCupStanding[]>={};
 for(const[group,teams]of Object.entries(WORLD_CUP_2026_GROUPS)){
  const rows=teams.map(teamName=>({group,teamId:teamId(teamName),teamName,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,goalDifference:0,points:0,position:0,qualification:"Em disputa" as WorldCupStanding["qualification"]}));
  const byId=new Map(rows.map(row=>[row.teamId,row]));
  for(const match of matches.filter(item=>item.stage.startsWith(`Grupo ${group}`)&&item.played)){
   const home=byId.get(match.homeTeamId),away=byId.get(match.awayTeamId);if(!home||!away)continue;
   const hg=match.homeGoals??0,ag=match.awayGoals??0;home.played++;away.played++;home.goalsFor+=hg;home.goalsAgainst+=ag;away.goalsFor+=ag;away.goalsAgainst+=hg;
   if(hg>ag){home.won++;away.lost++;home.points+=3}else if(ag>hg){away.won++;home.lost++;away.points+=3}else{home.drawn++;away.drawn++;home.points++;away.points++}
  }
  rows.forEach(row=>row.goalDifference=row.goalsFor-row.goalsAgainst);
  rows.sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor||teamReputation(b.teamName)-teamReputation(a.teamName)||a.teamName.localeCompare(b.teamName,"pt-BR"));
  rows.forEach((row,index)=>{row.position=index+1;row.qualification=index<2?"Classificado":"Em disputa"});tables[group]=rows;
 }
 const groupsComplete=matches.filter(match=>match.played).length===matches.length;
 if(groupsComplete){
  const thirds=Object.values(tables).map(rows=>rows[2]).sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor||teamReputation(b.teamName)-teamReputation(a.teamName));
  const bestThirdIds=new Set(thirds.slice(0,8).map(row=>row.teamId));
  for(const rows of Object.values(tables))for(const row of rows)row.qualification=row.position<=2?"Classificado":row.position===3&&bestThirdIds.has(row.teamId)?"Melhor terceiro":"Eliminado";
 }
 return{tables,matches,groupsComplete};
}

function fixture(id:string,date:string,stage:string,homeName:string,awayName:string):NationalWorldFixture{return{id,date,competition:"Copa do Mundo",stage,homeTeamId:teamId(homeName),awayTeamId:teamId(awayName),homeName,awayName};}

function pairSeeded(teams:WorldCupStanding[]){
 const ordered=[...teams].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor||teamReputation(b.teamName)-teamReputation(a.teamName));
 const pairs:Array<[WorldCupStanding,WorldCupStanding]>=[];const pool=[...ordered];
 while(pool.length){const high=pool.shift()!;let index=pool.length-1;while(index>0&&pool[index].group===high.group)index--;pairs.push([high,pool.splice(index,1)[0]])}
 return pairs;
}

function stageMatches(stage:string,dates:string[],pairs:Array<[string,string]>,seed:string,currentDate:string){return pairs.map(([home,away],index)=>resolvedMatch(fixture(`wc-${stage.replace(/\W+/g,"-").toLowerCase()}-${index+1}`,dates[index%dates.length],stage,home,away),seed,currentDate,true));}

export function worldCupSnapshot(year:number,seed:string,currentDate:string):WorldCupSnapshot{
 const groups=groupTables(year,seed,currentDate),knockout:InternationalWorldMatch[]=[];
 if(groups.groupsComplete){
  const qualifiers=Object.values(groups.tables).flat().filter(row=>row.qualification==="Classificado"||row.qualification==="Melhor terceiro");
  const r32=stageMatches("32 avos",[iso(year,"06-28"),iso(year,"06-29"),iso(year,"06-30"),iso(year,"07-01"),iso(year,"07-02"),iso(year,"07-03")],pairSeeded(qualifiers).map(([a,b])=>[a.teamName,b.teamName]),seed,currentDate);knockout.push(...r32);
  if(r32.every(match=>match.played&&match.winnerTeamId)){
   const winners=r32.map(match=>match.winnerTeamId===match.homeTeamId?match.homeName:match.awayName);const pairs=Array.from({length:8},(_,i)=>[winners[i*2],winners[i*2+1]] as [string,string]);
   const r16=stageMatches("Oitavas de final",[iso(year,"07-04"),iso(year,"07-05"),iso(year,"07-06"),iso(year,"07-07")],pairs,seed,currentDate);knockout.push(...r16);
   if(r16.every(match=>match.played&&match.winnerTeamId)){
    const w=r16.map(match=>match.winnerTeamId===match.homeTeamId?match.homeName:match.awayName);const qf=stageMatches("Quartas de final",[iso(year,"07-09"),iso(year,"07-10"),iso(year,"07-11")],Array.from({length:4},(_,i)=>[w[i*2],w[i*2+1]] as [string,string]),seed,currentDate);knockout.push(...qf);
    if(qf.every(match=>match.played&&match.winnerTeamId)){
     const qw=qf.map(match=>match.winnerTeamId===match.homeTeamId?match.homeName:match.awayName);const sf=stageMatches("Semifinais",[iso(year,"07-14"),iso(year,"07-15")],[[qw[0],qw[1]],[qw[2],qw[3]]],seed,currentDate);knockout.push(...sf);
     if(sf.every(match=>match.played&&match.winnerTeamId)){
      const finalists=sf.map(match=>match.winnerTeamId===match.homeTeamId?match.homeName:match.awayName),losers=sf.map(match=>match.winnerTeamId===match.homeTeamId?match.awayName:match.homeName);
      knockout.push(...stageMatches("3º lugar",[iso(year,"07-18")],[[losers[0],losers[1]]],seed,currentDate));
      knockout.push(...stageMatches("Final",[iso(year,"07-19")],[[finalists[0],finalists[1]]],seed,currentDate));
     }
    }
   }
  }
 }
 const final=knockout.find(match=>match.stage==="Final"&&match.played&&match.winnerTeamId),championName=final?(final.winnerTeamId===final.homeTeamId?final.homeName:final.awayName):undefined;
 const all=[...groups.matches,...knockout].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const currentStage=championName?"Encerrada":knockout.filter(match=>match.played).at(-1)?.stage??(groups.groupsComplete?"32 avos":"Fase de grupos");
 return{year,groupTables:groups.tables,matches:all,groupMatches:groups.matches,knockoutMatches:knockout,currentStage,championName};
}

export function internationalWorldFixtures(year:number,seed:string,currentDate:string):InternationalWorldMatch[]{
 const ordinary=worldNationalFixturesForSeason(year,seed).filter(fixture=>fixture.competition!=="Copa do Mundo").map(fixture=>resolvedMatch(fixture,seed,currentDate));
 return[...worldCupSnapshot(year,seed,currentDate).matches,...ordinary].sort((a,b)=>a.date.localeCompare(b.date)||a.competition.localeCompare(b.competition)||a.id.localeCompare(b.id));
}

export function nextInternationalStopDate(year:number,seed:string,fromDate:string,watchedFixtureId?:string){
 if(!watchedFixtureId)return undefined;
 return internationalWorldFixtures(year,seed,"9999-12-31").find(match=>match.id===watchedFixtureId&&match.date>=fromDate)?.date;
}
