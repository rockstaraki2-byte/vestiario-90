import { parseWorldCupSquadHtml, worldCupSquadTeamKey } from "@/game-engine/national-squad-source";

const CACHE="public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const SOURCE="https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads";
const UA="Mozilla/5.0 (compatible; Vestiario90/1.0; +https://vestiario-90.vercel.app)";

export async function GET(request:Request){
 const url=new URL(request.url),team=(url.searchParams.get("team")??"").trim();
 if(!team||team.length>80)return Response.json({error:"invalid_team"},{status:400,headers:{"Cache-Control":CACHE}});
 if(!worldCupSquadTeamKey(team))return Response.json({error:"no_verified_snapshot",team},{status:404,headers:{"Cache-Control":CACHE}});
 try{
  const response=await fetch(SOURCE,{headers:{"User-Agent":UA,"Accept-Language":"en-US,en;q=0.9"},next:{revalidate:604800}});
  if(!response.ok)return Response.json({error:"source_unavailable",team},{status:502,headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
  const squad=parseWorldCupSquadHtml(await response.text(),team);
  if(!squad)return Response.json({error:"squad_not_found",team},{status:404,headers:{"Cache-Control":CACHE}});
  return Response.json(squad,{headers:{"Cache-Control":CACHE,"X-V90-Squad-Source":"World-Cup-2026"}});
 }catch{return Response.json({error:"source_unavailable",team},{status:502,headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}})}
}
