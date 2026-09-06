import { SeededRng } from "./rng";
import { BRASILEIRAO_2026_CLUBS } from "../data/brasileirao-2026/rosters";

export type PlayerPersonality="Profissional"|"Ambicioso"|"Competitivo"|"Leal"|"Reservado"|"Temperamental";
export type SquadRole="Líder"|"Titular"|"Rotação"|"Reserva"|"Promessa";
export type PlayerPromise={id:string;type:"Mais minutos";createdRound:number;deadlineRound:number;targetAppearances:number;progressAppearances:number;status:"Ativa"|"Cumprida"|"Quebrada"};
export type LeaguePlayer = {
  id:string;
  sourceId?:number;
  name:string;
  position:string;
  age:number;
  overall:number;
  morale:number;
  condition:number;
  fatigue:number;
  form:number;
  goals:number;
  assists:number;
  yellowCards:number;
  injuryDays:number;
  suspensionMatches:number;
  status:string;
  personality:PlayerPersonality;
  squadRole:SquadRole;
  happiness:number;
  managerTrust:number;
  appearances:number;
  starts:number;
  minutes:number;
  promises:PlayerPromise[];
  lastConversationRound?:number;
};
export type LeagueClub = { id:string; sourceId:number; name:string; shortName:string; imageUrl:string; color:string; reputation:number; players:LeaguePlayer[] };
export type LeagueFixture = { id:string; round:number; homeClubId:string; awayClubId:string; played:boolean; homeGoals?:number; awayGoals?:number };
export type LeagueStanding = { clubId:string; played:number; won:number; drawn:number; lost:number; goalsFor:number; goalsAgainst:number; points:number };
export type LeagueWorld = { clubs:LeagueClub[]; fixtures:LeagueFixture[]; standings:LeagueStanding[] };

const COLORS=["#159447","#d33e34","#151515","#d43832","#ececec","#4a78d0","#d84137","#2b6fdd","#111111","#222222","#6c1f35","#171717","#2b78c5","#d42d2d","#e9e9e9","#d43b2d","#208251","#d5e7e2","#e0bd2b","#1e4ea3"];
const PERSONALITIES:PlayerPersonality[]=["Profissional","Ambicioso","Competitivo","Leal","Reservado","Temperamental"];

function assignRoles(players:LeaguePlayer[]){
  const ranked=[...players].sort((a,b)=>b.overall-a.overall);
  ranked.forEach((player,index)=>{
    const role:SquadRole=player.age<=21&&index>10?"Promessa":index<3?"Líder":index<11?"Titular":index<18?"Rotação":index<25?"Reserva":"Promessa";
    player.squadRole=role;
    player.status=role;
    if(role==="Líder")player.managerTrust=Math.min(100,player.managerTrust+8);
  });
}

function generatePlayers(clubId:string,clubIndex:number,rng:SeededRng):LeaguePlayer[]{
  const roster=BRASILEIRAO_2026_CLUBS[clubIndex].players;
  const players=roster.map((identity,index):LeaguePlayer=>({
    id:`${clubId}-p${index+1}`,
    name:identity.name,
    position:identity.position,
    age:rng.integer(18,36),
    overall:rng.integer(61,86),
    morale:rng.integer(66,86),
    condition:rng.integer(88,100),
    fatigue:rng.integer(0,9),
    form:rng.integer(5,8),
    goals:0,
    assists:0,
    yellowCards:0,
    injuryDays:0,
    suspensionMatches:0,
    status:"Reserva",
    personality:rng.pick(PERSONALITIES),
    squadRole:"Reserva",
    happiness:rng.integer(64,88),
    managerTrust:rng.integer(54,76),
    appearances:0,
    starts:0,
    minutes:0,
    promises:[],
  }));
  assignRoles(players);
  return players;
}

export function generateFixtures(clubIds:string[]):LeagueFixture[]{
  const teams=[...clubIds];
  if(teams.length%2)teams.push("BYE");
  const fixed=teams[0],rotating=teams.slice(1),half=teams.length/2,first:LeagueFixture[]=[];
  for(let round=1;round<teams.length;round++){
    const row=[fixed,...rotating];
    for(let i=0;i<half;i++){
      const a=row[i],b=row[row.length-1-i];
      if(a!=="BYE"&&b!=="BYE"){
        const swap=(round+i)%2===0;
        first.push({id:`r${round}-${a}-${b}`,round,homeClubId:swap?b:a,awayClubId:swap?a:b,played:false});
      }
    }
    rotating.unshift(rotating.pop()!);
  }
  const offset=teams.length-1;
  return [...first,...first.map(f=>({...f,id:`r${f.round+offset}-${f.awayClubId}-${f.homeClubId}`,round:f.round+offset,homeClubId:f.awayClubId,awayClubId:f.homeClubId}))];
}

export function createLeague(seed:string):LeagueWorld{
  const rng=new SeededRng(seed);
  const clubs=BRASILEIRAO_2026_CLUBS.map((identity,index)=>{
    const id=`club-${index+1}`;
    return{
      id,
      sourceId:identity.sourceId,
      name:identity.name,
      shortName:identity.shortName,
      imageUrl:identity.imageUrl,
      color:COLORS[index%COLORS.length],
      reputation:rng.integer(58,88),
      players:generatePlayers(id,index,rng),
    };
  });
  return{
    clubs,
    fixtures:generateFixtures(clubs.map(c=>c.id)),
    standings:clubs.map(c=>({clubId:c.id,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0})),
  };
}

export function sortedStandings(world:LeagueWorld):LeagueStanding[]{
  return [...world.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor);
}

export function playerAvailability(player:LeaguePlayer):"Lesionado"|"Suspenso"|"Disponível"{
  if(player.injuryDays>0)return "Lesionado";
  if(player.suspensionMatches>0)return "Suspenso";
  return "Disponível";
}
