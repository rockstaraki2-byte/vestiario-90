import { writeFile } from "node:fs/promises";

const CLUBS=[
 ["Palmeiras",1023],["Flamengo",614],["Corinthians",199],["São Paulo FC",585],["Santos FC",221],
 ["Grêmio",210],["Internacional",6600],["Cruzeiro EC",609],["Atlético Mineiro",330],["Botafogo FR",537],
 ["Fluminense",2462],["Vasco da Gama",978],["EC Bahia",10010],["Athletico Paranaense",679],["Red Bull Bragantino",8793],
 ["EC Vitória",2125],["Chapecoense",17776],["Coritiba SAF",776],["Mirassol",3876],["Remo",10997],
];
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
const api=async(endpoint)=>{
 const response=await fetch(`https://tmapi-alpha.transfermarkt.technology/${endpoint}`,{headers});
 const text=await response.text();
 let data;try{data=JSON.parse(text)}catch{data=text.slice(0,1000)}
 return{status:response.status,data};
};
const clubs=[];
const allIds=new Set();
for(const [name,id] of CLUBS){
 try{
  const result=await api(`club/${id}/squad`);
  const squad=result.data?.data?.squad??[];
  for(const item of squad)if(item.playerId)allIds.add(String(item.playerId));
  console.log("squad",name,id,result.status,squad.length);
  clubs.push({name,id,...result});
 }catch(error){console.error(name,id,error);clubs.push({name,id,status:0,error:String(error)});}
}
const ids=[...allIds];
const playerBatches=[];
for(let i=0;i<ids.length;i+=40){
 const chunk=ids.slice(i,i+40);
 const qs=chunk.map(id=>`ids[]=${encodeURIComponent(id)}`).join("&");
 try{
  const result=await api(`players?${qs}`);
  console.log("players",i,"-",i+chunk.length,result.status);
  playerBatches.push({ids:chunk,...result});
 }catch(error){console.error("players batch",i,error);playerBatches.push({ids:chunk,status:0,error:String(error)});}
}
await writeFile("tm-snapshot.json",JSON.stringify({snapshot:new Date().toISOString(),clubs,playerBatches},null,2));
