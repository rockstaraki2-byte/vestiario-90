import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{playerSocialContext}from"./social";
import{resolveWorldEvent,worldAfterDay,worldAfterMatch,type WorldInboxEvent}from"./world-events";

describe("Sprint 8 — conflitos e mídia",()=>{
 it("mediação de conflito melhora os dois jogadores e repercute no núcleo",()=>{
  const season=createSeason("conflict-resolution"),club=season.league.clubs[0],a=club.players[0],b=club.players[1];
  const context=playerSocialContext(club,a.id),groupMate=context.group?.memberIds.map(id=>club.players.find(p=>p.id===id)).find(p=>p&&p.id!==a.id&&p.id!==b.id);
  const event:WorldInboxEvent={id:"conflict-test",kind:"Conflito",title:"Conflito",body:"Teste",round:1,createdOrder:99,playerId:a.id,secondaryPlayerId:b.id,unread:true,resolved:false,choices:[{id:"mediate",label:"Mediar",outcome:"Resolvido",effect:{playerTrust:3,secondaryTrust:4,groupTrust:2}}]};
  const world={...season.livingWorld,inbox:[event,...season.livingWorld.inbox]};
  const aBefore=a.managerTrust,bBefore=b.managerTrust,mateBefore=groupMate?.managerTrust;
  const result=resolveWorldEvent(world,club,event.id,"mediate"),updatedA=result.club.players.find(p=>p.id===a.id)!,updatedB=result.club.players.find(p=>p.id===b.id)!;
  expect(updatedA.managerTrust).toBe(aBefore+3);expect(updatedB.managerTrust).toBe(bBefore+4);expect(result.world.news[0].source).toBe("Bastidores do Vestiário");
  if(groupMate&&mateBefore!==undefined)expect(result.club.players.find(p=>p.id===groupMate.id)!.managerTrust).toBe(mateBefore+2);
 });
 it("ambiente deteriorado pode gerar vazamento conflito ou repercussão social",()=>{
  const season=createSeason("crisis-generation"),club=season.league.clubs[0];club.players.forEach(p=>{p.happiness=38;p.managerTrust=34});
  const generated=new Set<string>();
  for(let i=0;i<30;i++){const world=worldAfterDay(season.livingWorld,club,8,`crisis-${i}`);for(const event of world.inbox)if(event.createdOrder>season.livingWorld.sequence)generated.add(event.kind);}
  expect([...generated].some(kind=>kind==="Conflito"||kind==="Vazamento"||kind==="Rede social")).toBe(true);
 });
 it("líder frustrado pode transformar derrota em crise de rede social",()=>{
  const season=createSeason("social-loss"),club=season.league.clubs[0];club.players.forEach(p=>p.managerTrust=25);
  const world=worldAfterMatch(season.livingWorld,club,2,0,2);
  expect(world.inbox.some(event=>event.kind==="Rede social"&&event.title.includes("Postagem"))).toBe(true);
 });
});
