import { SeededRng } from "./rng";

export type LeaguePlayer = { id:string; name:string; position:string; age:number; overall:number; morale:number; condition:number; form:number; goals:number; assists:number; status:string };
export type LeagueClub = { id:string; name:string; shortName:string; color:string; reputation:number; players:LeaguePlayer[] };
export type LeagueFixture = { id:string; round:number; homeClubId:string; awayClubId:string; played:boolean; homeGoals?:number; awayGoals?:number };
export type LeagueStanding = { clubId:string; played:number; won:number; drawn:number; lost:number; goalsFor:number; goalsAgainst:number; points:number };
export type LeagueWorld = { clubs:LeagueClub[]; fixtures:LeagueFixture[]; standings:LeagueStanding[] };

const CLUB_NAMES=["Aurora FC","Ferroviário Azul","União Serrana","Nacional do Vale","Atlético Imperial","Estrela do Norte","Real Horizonte","Grêmio Portuário","Vila Operária","Independente FC","Monte Verde","Oeste Metropolitano","Esportivo Central","Associação Rubra","Litoral EC","Pioneiros","São Bento da Mata","Guarani do Sul","Nova Capital","Racing Dourado"];
const FIRST=["João","Caio","Rafael","Lucas","Matheus","André","Diego","Bruno","Henrique","Vitor","Leonardo","Gabriel","Pedro","Gustavo","Eduardo","Felipe","Thiago","Samuel","Murilo","Daniel"];
const LAST=["Mendes","Lima","Tavares","Reis","Nunes","Alves","Costa","Luz","Rocha","Freitas","Barbosa","Vieira","Cardoso","Ramos","Pires","Duarte","Moura","Castro","Neves","Santos"];
const POSITIONS=["GOL","GOL","GOL","LD","LD","ZAG","ZAG","ZAG","ZAG","LE","LE","VOL","VOL","VOL","MC","MC","MC","MEI","MEI","PD","PD","PE","PE","ATA","ATA","ATA","ATA","ZAG","MC","ATA"];
const COLORS=["#d9ff43","#2876e8","#df4b4b","#f1c34d","#9d6bf2","#19b99a","#e76ea7","#f07d3d"];

function generatePlayers(clubId:string,rng:SeededRng):LeaguePlayer[]{return POSITIONS.map((position,index)=>({id:`${clubId}-p${index+1}`,name:`${rng.pick(FIRST)} ${rng.pick(LAST)}`,position,age:rng.integer(17,35),overall:rng.integer(58,84),morale:rng.integer(62,86),condition:rng.integer(86,100),form:rng.integer(5,8),goals:0,assists:0,status:index<11?"Titular":index<18?"Rotação":"Reserva"}))}

export function generateFixtures(clubIds:string[]):LeagueFixture[]{
 const teams=[...clubIds];if(teams.length%2)teams.push("BYE");const fixed=teams[0],rotating=teams.slice(1),half=teams.length/2,first:LeagueFixture[]=[];
 for(let round=1;round<teams.length;round++){
  const row=[fixed,...rotating];for(let i=0;i<half;i++){const a=row[i],b=row[row.length-1-i];if(a!=="BYE"&&b!=="BYE"){const swap=(round+i)%2===0;first.push({id:`r${round}-${a}-${b}`,round,homeClubId:swap?b:a,awayClubId:swap?a:b,played:false})}}
  rotating.unshift(rotating.pop()!);
 }
 const offset=teams.length-1;return [...first,...first.map(f=>({...f,id:`r${f.round+offset}-${f.awayClubId}-${f.homeClubId}`,round:f.round+offset,homeClubId:f.awayClubId,awayClubId:f.homeClubId}))];
}

export function createLeague(seed:string):LeagueWorld{const rng=new SeededRng(seed);const clubs=CLUB_NAMES.map((name,index)=>{const id=`club-${index+1}`;return{id,name,shortName:name.split(" ").map(x=>x[0]).join("").slice(0,3),color:COLORS[index%COLORS.length],reputation:rng.integer(45,80),players:generatePlayers(id,rng)}});return{clubs,fixtures:generateFixtures(clubs.map(c=>c.id)),standings:clubs.map(c=>({clubId:c.id,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0}))}}

export function sortedStandings(world:LeagueWorld):LeagueStanding[]{return [...world.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor)}
