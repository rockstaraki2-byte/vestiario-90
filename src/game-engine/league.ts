import { SeededRng } from "./rng";
import { SOCCERWIKI_CLUBS, SOCCERWIKI_PLAYERS } from "../data/soccerwiki";

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
};
export type LeagueClub = { id:string; sourceId:number; name:string; shortName:string; imageUrl:string; color:string; reputation:number; players:LeaguePlayer[] };
export type LeagueFixture = { id:string; round:number; homeClubId:string; awayClubId:string; played:boolean; homeGoals?:number; awayGoals?:number };
export type LeagueStanding = { clubId:string; played:number; won:number; drawn:number; lost:number; goalsFor:number; goalsAgainst:number; points:number };
export type LeagueWorld = { clubs:LeagueClub[]; fixtures:LeagueFixture[]; standings:LeagueStanding[] };

const POSITIONS=["GOL","GOL","GOL","LD","LD","ZAG","ZAG","ZAG","ZAG","LE","LE","VOL","VOL","VOL","MC","MC","MC","MEI","MEI","PD","PD","PE","PE","ATA","ATA","ATA","ATA","ZAG","MC","ATA"];
const COLORS=["#159447","#d33e34","#151515","#d43832","#ececec","#4a78d0","#d84137","#2b6fdd","#111111","#222222","#6c1f35","#171717","#2b78c5","#1f5cc4","#111111","#d42d2d","#e9e9e9","#d43b2d","#d73b2d","#4b7b35"];

function generatedIdentity(slot:number){
  const first=SOCCERWIKI_PLAYERS[slot%SOCCERWIKI_PLAYERS.length];
  const second=SOCCERWIKI_PLAYERS[(slot*7+31)%SOCCERWIKI_PLAYERS.length];
  const forename=first.name.split(" ")[0];
  const surname=second.name.split(" ").at(-1)??"Silva";
  return{name:`${forename} ${surname}`};
}

function generatePlayers(clubId:string,clubIndex:number,rng:SeededRng):LeaguePlayer[]{
  return POSITIONS.map((position,index)=>{
    const slot=clubIndex*POSITIONS.length+index;
    const source=SOCCERWIKI_PLAYERS[slot];
    const identity=source??generatedIdentity(slot);
    return{
      id:`${clubId}-p${index+1}`,
      sourceId:source?.sourceId,
      name:identity.name,
      position,
      age:rng.integer(17,35),
      overall:rng.integer(60,86),
      morale:rng.integer(62,86),
      condition:rng.integer(86,100),
      fatigue:rng.integer(0,10),
      form:rng.integer(5,8),
      goals:0,
      assists:0,
      yellowCards:0,
      injuryDays:0,
      suspensionMatches:0,
      status:index<11?"Titular":index<18?"Rotação":"Reserva",
    };
  });
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
  const clubs=SOCCERWIKI_CLUBS.map((identity,index)=>{
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
