import { professionalCompetitionById, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";
import { managerForClub } from "./club-ai";
import type { LeagueFixture, LeaguePlayer } from "./league";
import type { SeasonState } from "./season";
import { parallelLeagueById } from "./world-leagues";

export type AwardPerson={
 id:string;
 name:string;
 clubId:string;
 clubName:string;
 position?:string;
 score:number;
 detail:string;
};
export type AwardCoach={id:string;name:string;clubId:string;clubName:string;score:number;detail:string};
export type AwardTeamMember=AwardPerson&{slot:string};
export type CompetitionAwards={
 competitionId:ProfessionalCompetitionId;
 competitionName:string;
 round:number;
 monthLabel:string;
 playerOfRound?:AwardPerson;
 coachOfRound?:AwardCoach;
 teamOfRound:AwardTeamMember[];
 playerOfMonth?:AwardPerson;
 coachOfMonth?:AwardCoach;
 teamOfMonth:AwardTeamMember[];
 playerOfSeason?:AwardPerson;
 coachOfSeason?:AwardCoach;
 teamOfSeason:AwardTeamMember[];
};
export type GlobalAwards={
 ballonDor?:AwardPerson;
 fifaBest?:AwardPerson;
 bestGoalkeeper?:AwardPerson;
 bestYoungPlayer?:AwardPerson;
 worldXI:AwardTeamMember[];
 status:"Projeção"|"Oficial";
};
export type AwardNewsStory={id:string;title:string;summary:string;source:string;meta:string};

type Candidate=AwardPerson&{age?:number;goals:number;assists:number;rating:number;appearances:number;lastRating:number;form:number;overall:number;marketValue:number};
type TeamRow={clubId:string;clubName:string;played:number;won:number;drawn:number;lost:number;goalsFor:number;goalsAgainst:number;points:number};

const round2=(value:number)=>Math.round(value*100)/100;
const monthLabel=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${iso.slice(0,7)}-15T12:00:00Z`));
const normalizeRating=(value:number)=>value>0?value:6;

function mainCandidates(season:SeasonState):Candidate[]{return season.league.clubs.flatMap(club=>club.players.map(player=>candidateFromLeaguePlayer(player,club.id,club.name)));}
function candidateFromLeaguePlayer(player:LeaguePlayer,clubId:string,clubName:string):Candidate{
 const rating=normalizeRating(player.averageRating),appearances=Math.max(player.appearances,player.ratedMatches),score=rating*12+player.goals*2.5+player.assists*1.8+player.overall*.18+player.form*1.2;
 return{id:player.id,name:player.name,clubId,clubName,position:player.position,age:player.age,score:round2(score),detail:`${player.goals} G • ${player.assists} A • nota ${player.ratedMatches?player.averageRating.toFixed(2):"—"}`,goals:player.goals,assists:player.assists,rating,appearances,lastRating:normalizeRating(player.lastRating),form:player.form,overall:player.overall,marketValue:player.marketValueEur??0};
}
function parallelCandidates(season:SeasonState,id:ProfessionalCompetitionId):Candidate[]{
 const league=parallelLeagueById(season.worldLeagues,id);if(!league)return[];const names=new Map(league.teams.map(team=>[team.id,team.name]));
 return league.players.map(player=>{const rating=normalizeRating(player.averageRating),score=rating*12+player.goals*2.5+player.assists*1.8+Math.log10(Math.max(100_000,player.marketValueEur??100_000))*2;return{id:player.id,name:player.name,clubId:player.clubId,clubName:names.get(player.clubId)??player.clubId,position:player.position,score:round2(score),detail:`${player.goals} G • ${player.assists} A • nota ${player.ratedMatches?player.averageRating.toFixed(2):"—"}`,goals:player.goals,assists:player.assists,rating,appearances:player.appearances,lastRating:rating,form:6,overall:0,marketValue:player.marketValueEur??0};});
}
function competitionCandidates(season:SeasonState,id:ProfessionalCompetitionId){return id===season.competitionId?mainCandidates(season):parallelCandidates(season,id);}
function competitionRows(season:SeasonState,id:ProfessionalCompetitionId):TeamRow[]{
 if(id===season.competitionId){const names=new Map(season.league.clubs.map(club=>[club.id,club.name]));return season.league.standings.map(row=>({...row,clubName:names.get(row.clubId)??row.clubId}));}
 const league=parallelLeagueById(season.worldLeagues,id);if(!league)return[];const names=new Map(league.teams.map(team=>[team.id,team.name]));return league.standings.map(row=>({...row,clubName:names.get(row.clubId)??row.clubId}));
}
function competitionFixtures(season:SeasonState,id:ProfessionalCompetitionId):LeagueFixture[]{return id===season.competitionId?season.league.fixtures:parallelLeagueById(season.worldLeagues,id)?.fixtures??[];}
function latestRound(fixtures:LeagueFixture[]){return Math.max(0,...fixtures.filter(item=>item.played).map(item=>item.round));}
function roundPlayerScore(item:Candidate){return item.lastRating*14+item.form*2+item.goals*.5+item.assists*.4+item.overall*.06;}
function monthPlayerScore(item:Candidate){const availability=Math.min(1,Math.max(.25,item.appearances/5));return item.rating*14+item.lastRating*4+item.form*2.5+(item.goals*2.2+item.assists*1.7)*availability+item.overall*.08;}
function seasonPlayerScore(item:Candidate){const volume=Math.min(1.25,Math.max(.35,item.appearances/18));return item.rating*15*volume+item.goals*2.8+item.assists*2.1+item.overall*.1+Math.log10(Math.max(100_000,item.marketValue))*1.2;}
function toAward(item:Candidate,score:number,detail?:string):AwardPerson{return{...item,score:round2(score),detail:detail??item.detail};}
function topCandidate(items:Candidate[],score:(item:Candidate)=>number,filter:(item:Candidate)=>boolean=()=>true){const ranked=items.filter(filter).map(item=>({item,value:score(item)})).sort((a,b)=>b.value-a.value||b.item.goals-a.item.goals||b.item.assists-a.item.assists);return ranked[0]?toAward(ranked[0].item,ranked[0].value):undefined;}

const XI_SLOTS:Array<{slot:string;positions:string[]}>= [
 {slot:"GOL",positions:["GOL"]},{slot:"LD",positions:["LD","ZAG"]},{slot:"ZAG",positions:["ZAG"]},{slot:"ZAG",positions:["ZAG"]},{slot:"LE",positions:["LE","ZAG"]},
 {slot:"VOL",positions:["VOL","MC"]},{slot:"MC",positions:["MC","VOL","MEI"]},{slot:"MEI",positions:["MEI","MC","PE","PD"]},
 {slot:"PD",positions:["PD","PE","ATA"]},{slot:"ATA",positions:["ATA","PD","PE"]},{slot:"PE",positions:["PE","PD","ATA"]},
];
function bestXI(candidates:Candidate[],score:(item:Candidate)=>number):AwardTeamMember[]{const used=new Set<string>(),out:AwardTeamMember[]=[];for(const slot of XI_SLOTS){let pool=candidates.filter(item=>!used.has(item.id)&&item.position&&slot.positions.includes(item.position));if(!pool.length)pool=candidates.filter(item=>!used.has(item.id));const chosen=pool.sort((a,b)=>score(b)-score(a))[0];if(!chosen)continue;used.add(chosen.id);out.push({...toAward(chosen,score(chosen)),slot:slot.slot});}return out;}

function coachName(season:SeasonState,clubId:string,clubName:string){if(clubId===season.selectedClubId&&season.career.status==="Empregado")return"Você";return managerForClub(season.clubAi,clubId)?.managerName??`Técnico do ${clubName}`;}
function resultForClub(fixture:LeagueFixture,clubId:string){const home=fixture.homeClubId===clubId,gf=home?(fixture.homeGoals??0):(fixture.awayGoals??0),ga=home?(fixture.awayGoals??0):(fixture.homeGoals??0);return{gf,ga,points:gf>ga?3:gf===ga?1:0};}
function coachOfRound(season:SeasonState,id:ProfessionalCompetitionId,rows:TeamRow[],fixtures:LeagueFixture[]):AwardCoach|undefined{
 const round=latestRound(fixtures);if(!round)return undefined;const table=new Map(rows.map((row,index)=>[row.clubId,index+1])),latest=fixtures.filter(item=>item.played&&item.round===round);let best:AwardCoach|undefined;
 for(const fixture of latest)for(const clubId of [fixture.homeClubId,fixture.awayClubId]){const row=rows.find(item=>item.clubId===clubId);if(!row)continue;const result=resultForClub(fixture,clubId),score=result.points*20+(result.gf-result.ga)*6+Math.max(0,12-(table.get(clubId)??12))*.4;if(!best||score>best.score)best={id:`coach-r${round}-${clubId}`,name:id===season.competitionId?coachName(season,clubId,row.clubName):`Comissão técnica do ${row.clubName}`,clubId,clubName:row.clubName,score:round2(score),detail:`R${round} • ${result.gf}–${result.ga}`};}
 return best;
}
function coachForm(season:SeasonState,id:ProfessionalCompetitionId,rows:TeamRow[],fixtures:LeagueFixture[],window:number):AwardCoach|undefined{
 let best:AwardCoach|undefined;for(const row of rows){const recent=fixtures.filter(item=>item.played&&(item.homeClubId===row.clubId||item.awayClubId===row.clubId)).sort((a,b)=>b.round-a.round).slice(0,window);if(!recent.length)continue;let pts=0,gd=0;for(const fixture of recent){const result=resultForClub(fixture,row.clubId);pts+=result.points;gd+=result.gf-result.ga;}const score=pts*7+gd*2.5+(row.points/Math.max(1,row.played))*3;if(!best||score>best.score)best={id:`coach-form-${id}-${row.clubId}`,name:id===season.competitionId?coachName(season,row.clubId,row.clubName):`Comissão técnica do ${row.clubName}`,clubId:row.clubId,clubName:row.clubName,score:round2(score),detail:`${pts}/${recent.length*3} pts recentes • saldo ${gd>=0?"+":""}${gd}`};}return best;
}
function coachSeason(season:SeasonState,id:ProfessionalCompetitionId,rows:TeamRow[]):AwardCoach|undefined{const ranked=[...rows].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst));const row=ranked[0];if(!row)return undefined;return{id:`coach-season-${id}-${row.clubId}`,name:id===season.competitionId?coachName(season,row.clubId,row.clubName):`Comissão técnica do ${row.clubName}`,clubId:row.clubId,clubName:row.clubName,score:round2(row.points*2+(row.goalsFor-row.goalsAgainst)),detail:`${row.points} pts • ${row.won} vitórias • saldo ${row.goalsFor-row.goalsAgainst>=0?"+":""}${row.goalsFor-row.goalsAgainst}`};}

export function buildCompetitionAwards(season:SeasonState,id:ProfessionalCompetitionId=season.competitionId):CompetitionAwards{
 const definition=professionalCompetitionById(id),candidates=competitionCandidates(season,id),rows=competitionRows(season,id),fixtures=competitionFixtures(season,id),round=latestRound(fixtures);
 return{competitionId:id,competitionName:definition.name,round,monthLabel:monthLabel(season.currentDate),playerOfRound:topCandidate(candidates,roundPlayerScore,item=>item.appearances>0),coachOfRound:coachOfRound(season,id,rows,fixtures),teamOfRound:bestXI(candidates,roundPlayerScore),playerOfMonth:topCandidate(candidates,monthPlayerScore,item=>item.appearances>0),coachOfMonth:coachForm(season,id,rows,fixtures,5),teamOfMonth:bestXI(candidates,monthPlayerScore),playerOfSeason:topCandidate(candidates,seasonPlayerScore,item=>item.appearances>0),coachOfSeason:coachSeason(season,id,rows),teamOfSeason:bestXI(candidates,seasonPlayerScore)};
}

function globalCandidates(season:SeasonState):Candidate[]{const all=[...mainCandidates(season)];for(const id of Object.keys(season.worldLeagues.leagues) as ProfessionalCompetitionId[])all.push(...parallelCandidates(season,id));return all;}
function worldScore(item:Candidate){return seasonPlayerScore(item)+item.marketValue>0?0:0;}
export function buildGlobalAwards(season:SeasonState):GlobalAwards{
 const candidates=globalCandidates(season),score=(item:Candidate)=>seasonPlayerScore(item)+Math.log10(Math.max(100_000,item.marketValue))*2.4,ballonDor=topCandidate(candidates,score,item=>item.appearances>0),fifaBest=topCandidate(candidates,item=>score(item)+item.rating*2,item=>item.appearances>0),bestGoalkeeper=topCandidate(candidates,item=>score(item)+item.rating*4,item=>item.position==="GOL"&&item.appearances>0),bestYoungPlayer=topCandidate(candidates,item=>score(item)+Math.max(0,24-(item.age??24))*1.5,item=>(item.age??99)<=21&&item.appearances>0),worldXI=bestXI(candidates,score),status=season.completed?"Oficial":"Projeção" as const;return{ballonDor,fifaBest,bestGoalkeeper,bestYoungPlayer,worldXI,status};
}

export function buildAwardNews(season:SeasonState):AwardNewsStory[]{
 const league=buildCompetitionAwards(season,season.competitionId),global=buildGlobalAwards(season),stories:AwardNewsStory[]=[];
 if(league.playerOfRound&&league.round>0)stories.push({id:`award-round-${season.year}-${league.round}-${league.playerOfRound.id}`,title:`${league.playerOfRound.name} é o destaque da rodada ${league.round}`,summary:`O jogador do ${league.playerOfRound.clubName} liderou a avaliação da rodada em ${league.competitionName}. ${league.playerOfRound.detail}.`,source:"Prêmios da Competição",meta:`Rodada ${league.round}`});
 if(league.coachOfRound&&league.round>0)stories.push({id:`award-coach-round-${season.year}-${league.round}-${league.coachOfRound.clubId}`,title:`${league.coachOfRound.name} leva o prêmio de técnico da rodada`,summary:`O trabalho no ${league.coachOfRound.clubName} foi o mais valorizado na rodada ${league.round}. ${league.coachOfRound.detail}.`,source:"Prêmios da Competição",meta:`Rodada ${league.round}`});
 if(league.playerOfMonth)stories.push({id:`award-month-${season.currentDate.slice(0,7)}-${league.playerOfMonth.id}`,title:`${league.playerOfMonth.name} lidera a corrida a jogador do mês`,summary:`A combinação de nota, forma e produção ofensiva coloca o atleta do ${league.playerOfMonth.clubName} no topo de ${league.monthLabel}.`,source:"Prêmios da Competição",meta:league.monthLabel});
 if(global.ballonDor)stories.push({id:`award-ballon-${season.year}-${global.ballonDor.id}`,title:`Ballon d'Or: ${global.ballonDor.name} aparece na frente da corrida`,summary:`${global.status==="Oficial"?"A temporada terminou e o prêmio foi definido.":"A projeção do save considera desempenho, regularidade, produção e peso competitivo."} ${global.ballonDor.clubName} tem o nome mais bem avaliado neste momento.`,source:"Futebol Mundial",meta:`${season.year} • ${global.status}`});
 return stories;
}
