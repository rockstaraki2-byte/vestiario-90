import { NextResponse } from "next/server";

const CLUBS=[
 ["Palmeiras",1023],["Flamengo",614],["Corinthians",199],["São Paulo FC",585],["Santos FC",221],
 ["Grêmio",210],["Internacional",6600],["Cruzeiro EC",609],["Atlético Mineiro",330],["Botafogo FR",537],
 ["Fluminense",2462],["Vasco da Gama",978],["EC Bahia",10010],["Athletico Paranaense",679],["Red Bull Bragantino",8793],
 ["EC Vitória",2125],["Chapecoense",17776],["Coritiba SAF",776],["Mirassol",3876],["Remo",10997],
] as const;

export const dynamic="force-dynamic";

export async function GET(){
 const headers={Accept:"application/json","Accept-Language":"pt-BR","User-Agent":"Mozilla/5.0"};
 const results=[];
 for(const [name,id] of CLUBS){
  try{
   const response=await fetch(`https://tmapi-alpha.transfermarkt.technology/club/${id}/squad`,{headers,cache:"no-store"});
   results.push({name,id,status:response.status,data:response.ok?await response.json():await response.text()});
  }catch(error){results.push({name,id,status:0,error:error instanceof Error?error.message:String(error)});}
 }
 return NextResponse.json({snapshot:new Date().toISOString(),clubs:results});
}
