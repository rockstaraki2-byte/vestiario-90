import { BRAZIL_STATE_2026_COMPETITIONS } from "../data/world-2026/state-competitions.generated";
import type { LeagueWorld } from "./league";
import type { WorldCompetitionDefinition,WorldCompetitionId,WorldCompetitionMatch,WorldParticipant,WorldTournamentState } from "./world-competitions";

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|sc|ec|ac|se|aa|clube|club|futebol|football|esporte|sport)\b/g," ").replace(/[^a-z0-9]+/g," ").trim();
function equivalent(a:string,b:string){const x=normalize(a),y=normalize(b);return x===y||(x.length>4&&y.includes(x))||(y.length>4&&x.includes(y));}
function addDays(iso:string,days:number){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function templateDate(date:string){return`2026${date.slice(4)}`;}
function rounds<T>(items:T[]){const teams=[...items] as Array<T|null>;if(teams.length%2)teams.push(null);const out:Array<Array<[T,T]>>=[];for(let r=0;r<teams.length-1;r++){const pairs:Array<[T,T]>=[];for(let i=0;i<teams.length/2;i++){const a=teams[i],b=teams[teams.length-1-i];if(a&&b)pairs.push(r%2===0?[a,b]:[b,a]);}out.push(pairs);const fixed=teams[0],rest=teams.slice(1);rest.unshift(rest.pop()!);teams.splice(0,teams.length,fixed,...rest);}return out;}

export function createStateWorldTournaments(league:LeagueWorld,year:number):WorldTournamentState[]{
 const activeClubs=league.clubs;
 return BRAZIL_STATE_2026_COMPETITIONS.filter(comp=>comp.tier==="A1"&&comp.clubs.length>=4).map(comp=>{
  const participants:WorldParticipant[]=comp.clubs.map((club,index)=>{const active=activeClubs.find(item=>equivalent(item.name,club.name));return{id:`state-${comp.id}-${club.transfermarktId}`,name:club.name,shortName:club.shortName||club.name.slice(0,12).toUpperCase(),country:"Brasil",reputation:Math.max(48,Math.min(92,Math.round(54+Math.log10(Math.max(500_000,club.marketValueEur||500_000)/500_000)*10))),activeClubId:active?.id,pot:index%4+1};});
  const rr=rounds(participants),start=`${year}-01-10`,roundDates=rr.map((_,index)=>addDays(start,index*4)),semiDate=addDays(roundDates.at(-1)??start,7),finalDate=addDays(semiDate,7),definition:WorldCompetitionDefinition={id:`STATE_${comp.id}` as WorldCompetitionId,name:comp.name,shortName:comp.name.replace("Campeonato ",""),country:"Brasil",kind:"Estadual",participants:participants.length,roundInterval:1,format:"Liga + mata-mata",rulesSummary:`${participants.length} clubes em fase classificatória estadual; os quatro melhores avançam à semifinal e à final. Calendário integrado ao save para evitar sobreposição de compromissos.`,stages:[{name:"Fase classificatória",dates:roundDates.map(templateDate),legs:1,kind:"league",rule:"Turno único • quatro melhores avançam"},{name:"Semifinal",dates:[templateDate(semiDate)],legs:1,kind:"knockout",rule:"Jogo único"},{name:"Final",dates:[templateDate(finalDate)],legs:1,kind:"knockout",rule:"Jogo único"}]};
  const matches:WorldCompetitionMatch[]=[];rr.forEach((pairs,round)=>pairs.forEach(([home,away],index)=>matches.push({id:`state-${comp.id}-r${round+1}-${index+1}`,competitionId:definition.id,stage:"Fase classificatória",roundDue:round+1,date:roundDates[round],home,away,played:false,matchday:round+1,tableStage:true})));
  return{definition,participants,matches,currentStage:"Fase classificatória",currentStageIndex:0,seasonYear:year,completed:false};
 });
}
