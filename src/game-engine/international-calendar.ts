import { NATIONAL_TEAMS_2026, NATIONS_LEAGUE_2026_27_GROUPS, WORLD_CUP_2026_GROUPS } from "../data/national-teams-2026";
import { SeededRng } from "./rng";

export type InternationalWindow={
 id:string;
 label:string;
 competition:string;
 startDate:string;
 endDate:string;
 reason:string;
 longBreak:boolean;
};

export type NationalWorldFixture={
 id:string;
 date:string;
 competition:"Copa do Mundo"|"Nations League"|"Amistoso";
 stage:string;
 homeTeamId:string;
 awayTeamId:string;
 homeName:string;
 awayName:string;
};

export type NationalSpectatorEvent={minute:number;type:"goal"|"chance"|"card";team:"home"|"away";text:string};
export type NationalSpectatorResult={homeGoals:number;awayGoals:number;shotsHome:number;shotsAway:number;possessionHome:number;events:NationalSpectatorEvent[]};

function iso(year:number,tail:string){return`${year}-${tail}`;}
function slug(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function teamFor(name:string){return NATIONAL_TEAMS_2026.find(team=>team.name===name);}
function teamId(name:string){return teamFor(name)?.id??slug(name);}
function reputation(name:string){return teamFor(name)?.reputation??72;}
function inRange(date:string,start:string,end:string){return date>=start&&date<=end;}

export function internationalWindowsForSeason(year:number):InternationalWindow[]{
 return[
  {id:`fifa-mar-${year}`,label:"Data FIFA de março",competition:"Seleções",startDate:iso(year,"03-23"),endDate:iso(year,"03-31"),reason:"Clubes entram em pausa para convocações, viagens e jogos internacionais.",longBreak:false},
  {id:`wc-prep-${year}`,label:"Preparação para a Copa do Mundo",competition:"Copa do Mundo",startDate:iso(year,"06-01"),endDate:iso(year,"06-10"),reason:"Período de apresentação e preparação das seleções antes do Mundial.",longBreak:true},
  {id:`wc-${year}`,label:"Copa do Mundo",competition:"Copa do Mundo",startDate:iso(year,"06-11"),endDate:iso(year,"07-19"),reason:"Competições de clubes ficam suspensas durante o Mundial.",longBreak:true},
  {id:`fifa-sep-${year}`,label:"Data FIFA / Nations League",competition:"Seleções",startDate:iso(year,"09-21"),endDate:iso(year,"10-07"),reason:"Janela internacional com jogos oficiais e amistosos; clubes não atuam.",longBreak:false},
  {id:`fifa-nov-${year}`,label:"Data FIFA de novembro",competition:"Seleções",startDate:iso(year,"11-09"),endDate:iso(year,"11-18"),reason:"Última janela internacional do ano, com pausa das competições de clubes.",longBreak:false},
  {id:`fifa-mar-${year+1}`,label:"Data FIFA de março",competition:"Seleções",startDate:iso(year+1,"03-22"),endDate:iso(year+1,"03-31"),reason:"Janela internacional com mata-mata e amistosos de seleções.",longBreak:false},
  {id:`fifa-jun-${year+1}`,label:"Janela internacional de junho",competition:"Seleções",startDate:iso(year+1,"06-07"),endDate:iso(year+1,"06-14"),reason:"Final Four e amistosos internacionais interrompem a agenda dos clubes.",longBreak:false},
 ];
}

export function internationalWindowForDate(date:string,year:number){return internationalWindowsForSeason(year).find(window=>inRange(date,window.startDate,window.endDate));}
export function isClubDateBlockedByInternationalWindow(date:string,year:number){return Boolean(internationalWindowForDate(date,year));}

function roundRobinRounds(input:string[]){
 const teams=[...input];if(teams.length%2)teams.push("FOLGA");const rounds:Array<Array<[string,string]>>=[];
 for(let round=0;round<teams.length-1;round++){
  const pairs:Array<[string,string]>=[];
  for(let i=0;i<teams.length/2;i++){const a=teams[i],b=teams[teams.length-1-i];if(a!=="FOLGA"&&b!=="FOLGA")pairs.push(round%2===0?[a,b]:[b,a]);}
  rounds.push(pairs);const fixed=teams[0],rest=teams.slice(1);rest.unshift(rest.pop()!);teams.splice(0,teams.length,fixed,...rest);
 }
 return rounds;
}

function nationalFixture(id:string,date:string,competition:NationalWorldFixture["competition"],stage:string,homeName:string,awayName:string):NationalWorldFixture{return{id,date,competition,stage,homeTeamId:teamId(homeName),awayTeamId:teamId(awayName),homeName,awayName};}

function worldCupFixtures(year:number){
 const dates=[iso(year,"06-12"),iso(year,"06-18"),iso(year,"06-24")],out:NationalWorldFixture[]=[];
 for(const[group,teams]of Object.entries(WORLD_CUP_2026_GROUPS)){
  const rounds=roundRobinRounds(teams).slice(0,3);
  rounds.forEach((pairs,round)=>pairs.forEach(([home,away],index)=>out.push(nationalFixture(`wc-${year}-${group}-${round+1}-${index+1}`,dates[round],"Copa do Mundo",`Grupo ${group} • rodada ${round+1}`,home,away))));
 }
 return out;
}

function nationsLeagueFixtures(year:number){
 const dates=[iso(year,"09-24"),iso(year,"09-28"),iso(year,"10-02"),iso(year,"10-06"),iso(year,"11-13"),iso(year,"11-17")],out:NationalWorldFixture[]=[];
 for(const[tier,groups]of Object.entries(NATIONS_LEAGUE_2026_27_GROUPS))for(const[group,teams]of Object.entries(groups)){
  const first=roundRobinRounds([...(teams as readonly string[])]),rounds=[...first,...first.map(pairs=>pairs.map(([home,away])=>[away,home] as [string,string]))].slice(0,6);
  rounds.forEach((pairs,round)=>pairs.forEach(([home,away],index)=>out.push(nationalFixture(`unl-${year}-${tier}-${group}-${round+1}-${index+1}`,dates[round],"Nations League",`Liga ${tier} • ${group} • rodada ${round+1}`,home,away))));
 }
 return out;
}

function shuffledTeams(seed:string,key:string){const rng=new SeededRng(`${seed}:international-friendly:${key}`),teams=NATIONAL_TEAMS_2026.map(team=>team.name);for(let i=teams.length-1;i>0;i--){const j=rng.integer(0,i);[teams[i],teams[j]]=[teams[j],teams[i]];}return teams;}
function friendlyFixtures(year:number,seed:string,date:string,key:string){const teams=shuffledTeams(seed,key),out:NationalWorldFixture[]=[];for(let i=0;i+1<teams.length;i+=2)out.push(nationalFixture(`friendly-${year}-${key}-${i/2+1}`,date,"Amistoso","Data FIFA",teams[i],teams[i+1]));return out;}

export function worldNationalFixturesForSeason(year:number,seed:string):NationalWorldFixture[]{
 return[
  ...friendlyFixtures(year,seed,iso(year,"03-28"),"mar-1"),
  ...friendlyFixtures(year,seed,iso(year,"03-31"),"mar-2"),
  ...friendlyFixtures(year,seed,iso(year,"06-05"),"pre-wc"),
  ...worldCupFixtures(year),
  ...nationsLeagueFixtures(year),
 ].sort((a,b)=>a.date.localeCompare(b.date)||a.competition.localeCompare(b.competition)||a.id.localeCompare(b.id));
}

export function nationalWorldFixtureById(year:number,seed:string,id:string){return worldNationalFixturesForSeason(year,seed).find(fixture=>fixture.id===id);}

function goals(rng:SeededRng,lambda:number){let value=0;for(let i=0;i<7;i++)if(rng.next()<Math.max(.035,Math.min(.48,lambda/7)))value++;return value;}
export function nationalSpectatorResult(fixture:NationalWorldFixture,seed:string):NationalSpectatorResult{
 const homeRep=reputation(fixture.homeName),awayRep=reputation(fixture.awayName),rng=new SeededRng(`${seed}:spectator:${fixture.id}`),delta=homeRep-awayRep+2,homeGoals=goals(rng,1.35+delta*.026),awayGoals=goals(rng,1.12-delta*.024),shotsHome=Math.max(5,rng.integer(7,18)+Math.round(delta/7)),shotsAway=Math.max(5,rng.integer(7,18)-Math.round(delta/8)),possessionHome=Math.max(34,Math.min(66,50+Math.round(delta/3))),events:NationalSpectatorEvent[]=[];
 const goalEvent=(team:"home"|"away",index:number)=>{const name=team==="home"?fixture.homeName:fixture.awayName,minute=rng.integer(5,88);events.push({minute,type:"goal",team,text:`Gol de ${name}! A seleção aproveita a chance e muda o placar.`});if(index%2===1&&rng.next()>.55)events.push({minute:Math.min(90,minute+1),type:"chance",team,text:`Pressão de ${name} logo após o gol.`});};
 for(let i=0;i<homeGoals;i++)goalEvent("home",i);for(let i=0;i<awayGoals;i++)goalEvent("away",i);
 for(let i=0;i<4;i++){const team=rng.next()>.5?"home":"away",name=team==="home"?fixture.homeName:fixture.awayName;events.push({minute:rng.integer(4,89),type:"chance",team,text:`${name} chega com perigo e obriga a defesa a trabalhar.`});}
 for(let i=0;i<2;i++){const team=rng.next()>.5?"home":"away",name=team==="home"?fixture.homeName:fixture.awayName;events.push({minute:rng.integer(18,86),type:"card",team,text:`Cartão para ${name} após falta no meio-campo.`});}
 events.sort((a,b)=>a.minute-b.minute||a.type.localeCompare(b.type));return{homeGoals,awayGoals,shotsHome,shotsAway,possessionHome,events};
}
