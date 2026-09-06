import { writeFile } from "node:fs/promises";

const CLUBS=[
 ["Palmeiras",1023],["Flamengo",614],["Corinthians",199],["São Paulo FC",585],["Santos FC",221],
 ["Grêmio",210],["Internacional",6600],["Cruzeiro EC",609],["Atlético Mineiro",330],["Botafogo FR",537],
 ["Fluminense",2462],["Vasco da Gama",978],["EC Bahia",10010],["Athletico Paranaense",679],["Red Bull Bragantino",8793],
 ["EC Vitória",2125],["Chapecoense",17776],["Coritiba SAF",776],["Mirassol",3876],["Remo",10997],
];
const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
const clubs=[];
for(const [name,id] of CLUBS){
 const url=`https://tmapi-alpha.transfermarkt.technology/club/${id}/squad`;
 try{
  const response=await fetch(url,{headers});
  const text=await response.text();
  let data; try{data=JSON.parse(text)}catch{data=text.slice(0,1000)}
  console.log(name,id,response.status,Array.isArray(data)?data.length:Object.keys(data??{}).join(","));
  clubs.push({name,id,status:response.status,data});
 }catch(error){console.error(name,id,error);clubs.push({name,id,status:0,error:String(error)});}
}
await writeFile("tm-snapshot.json",JSON.stringify({snapshot:new Date().toISOString(),clubs},null,2));
