import { mkdir, writeFile } from "node:fs/promises";

const CLUBS=[
 {name:"Palmeiras",tm:1023,sw:300,short:"PAL"},{name:"Flamengo",tm:614,sw:294,short:"FLA"},{name:"Corinthians",tm:199,sw:290,short:"COR"},{name:"São Paulo FC",tm:585,sw:306,short:"SAO"},{name:"Santos FC",tm:221,sw:304,short:"SAN"},
 {name:"Grêmio",tm:210,sw:602,short:"GRE"},{name:"Internacional",tm:6600,sw:298,short:"INT"},{name:"Cruzeiro EC",tm:609,sw:292,short:"CRU"},{name:"Atlético Mineiro",tm:330,sw:286,short:"CAM"},{name:"Botafogo FR",tm:537,sw:288,short:"BOT"},
 {name:"Fluminense",tm:2462,sw:295,short:"FLU"},{name:"Vasco da Gama",tm:978,sw:307,short:"VAS"},{name:"EC Bahia",tm:10010,sw:1473,short:"BAH"},{name:"Athletico Paranaense",tm:679,sw:287,short:"CAP"},{name:"Red Bull Bragantino",tm:8793,sw:1447,short:"RBB"},
 {name:"EC Vitória",tm:2125,sw:1237,short:"VIT"},{name:"Chapecoense",tm:17776,sw:2379,short:"CHA"},{name:"Coritiba SAF",tm:776,sw:291,short:"CFC"},{name:"Mirassol",tm:3876,sw:2813,short:"MIR"},{name:"Remo",tm:10997,sw:2476,short:"REM"},
];
const POSITION={GOL:"GOL",ZAG:"ZAG",LD:"LD",LE:"LE",VOL:"VOL",MC:"MC",MEI:"MEI",PD:"PD",PE:"PE",CA:"ATA",SA:"ATA",MD:"PD"};
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
const api=async(endpoint)=>{
 const response=await fetch(`https://tmapi-alpha.transfermarkt.technology/${endpoint}`,{headers});
 const text=await response.text();
 let data;try{data=JSON.parse(text)}catch{data=text.slice(0,1000)}
 if(!response.ok)throw new Error(`${endpoint}: ${response.status} ${String(text).slice(0,200)}`);
 return data;
};
const clubData=[];
const allIds=new Set();
for(const club of CLUBS){
 const response=await api(`club/${club.tm}/squad`);
 const squad=response?.data?.squad??[];
 for(const item of squad)if(item.playerId)allIds.add(String(item.playerId));
 console.log("squad",club.name,squad.length);
 clubData.push({...club,squad});
}
const ids=[...allIds],profiles=new Map();
for(let i=0;i<ids.length;i+=40){
 const chunk=ids.slice(i,i+40),qs=chunk.map(id=>`ids[]=${encodeURIComponent(id)}`).join("&");
 const response=await api(`players?${qs}`);
 for(const player of response?.data??[])profiles.set(String(player.id),player);
 console.log("players",Math.min(i+40,ids.length),"/",ids.length);
}
let positiveValues=0,totalPlayers=0;
const crest=(id)=>`https://cdn.soccerwiki.org/images/logos/clubs/${id}.png`;
const out=[];
out.push('export type RosterPosition="GOL"|"LD"|"LE"|"ZAG"|"VOL"|"MC"|"MEI"|"PD"|"PE"|"ATA";');
out.push('export type RosterPlayer={transfermarktId:string;name:string;position:RosterPosition;age:number;marketValueEur:number|null;marketValueUpdated?:string};');
out.push('export type BrasileiroClubRoster={sourceId:number;transfermarktId:number;name:string;shortName:string;imageUrl:string;marketValueEur:number;players:RosterPlayer[]};');
out.push('const crest=(id:number)=>`https://cdn.soccerwiki.org/images/logos/clubs/${id}.png`;');
out.push('__META__');
out.push('export const BRASILEIRAO_2026_CLUBS:BrasileiroClubRoster[]=[');
for(const club of clubData){
 let clubValue=0;const rows=[];
 for(const member of club.squad){
  const player=profiles.get(String(member.playerId));if(!player)continue;totalPlayers++;
  const raw=player?.marketValueDetails?.current?.value,value=typeof raw==="number"&&raw>0?raw:null;
  if(value!==null){positiveValues++;clubValue+=value;}
  const short=player?.attributes?.position?.shortName,position=POSITION[short]??"MC";
  const age=player?.lifeDates?.age;
  if(typeof age!=="number")throw new Error(`Sem idade para ${player.name}`);
  const updated=player?.marketValueDetails?.current?.determined;
  rows.push({transfermarktId:String(player.id),name:player.name,position,age,marketValueEur:value,...(updated&&value!==null?{marketValueUpdated:updated}:{})});
 }
 out.push(`  {sourceId:${club.sw},transfermarktId:${club.tm},name:${JSON.stringify(club.name)},shortName:${JSON.stringify(club.short)},imageUrl:crest(${club.sw}),marketValueEur:${clubValue},players:${JSON.stringify(rows)}},`);
}
out.push('];');
const coverage=totalPlayers?positiveValues/totalPlayers:0;
out[4]=`export const BRASILEIRAO_2026_ROSTER_META={snapshot:"2026-09-06",source:"Transfermarkt (API interna, snapshot estático) + SoccerWiki (escudos)",clubs:20,playerProfiles:${totalPlayers},ageCoverage:1,marketValueCoverage:${coverage.toFixed(6)}} as const;`;
await mkdir("src/data/brasileirao-2026",{recursive:true});
await writeFile("src/data/brasileirao-2026/transfermarkt-snapshot.ts",out.join("\n")+"\n");
await writeFile("tm-snapshot.json",JSON.stringify({snapshot:new Date().toISOString(),clubs:clubData.map(c=>({name:c.name,transfermarktId:c.tm,squadSize:c.squad.length})),playerProfiles:totalPlayers,positiveMarketValues:positiveValues},null,2));
console.log("generated",totalPlayers,"players, market values",positiveValues,"coverage",coverage.toFixed(3));
